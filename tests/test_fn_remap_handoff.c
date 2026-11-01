#define _GNU_SOURCE
// Exercise real output records and physical-state recovery without evdev/root.
#include <sys/ioctl.h>
#include <stdarg.h>
static int input_ioctl(int fd, unsigned long request, ...);
#define ioctl input_ioctl
#define main gold_daemon_main
#include "../fn_remap.c"
#undef main
#undef ioctl

static unsigned char physical_keys[(KEY_MAX + 8) / 8];
static bool fail_query;
static int failures;
static int input_ioctl(int fd, unsigned long request, ...) {
    (void)fd;
    if (_IOC_TYPE(request) != 'E' || _IOC_NR(request) != 0x18 || fail_query) {
        errno = EIO;
        return -1;
    }
    va_list args;
    va_start(args, request);
    void *bits = va_arg(args, void *);
    va_end(args);
    size_t size = _IOC_SIZE(request);
    memset(bits, 0, size);
    memcpy(bits, physical_keys, size < sizeof(physical_keys) ? size : sizeof(physical_keys));
    return (int)size;
}
static void check(bool ok, const char *label) {
    printf("%s %s\n", ok ? "ok  " : "FAIL", label);
    failures += !ok;
}
static DeviceContext open_device(int input[2], int output[2]) {
    if (pipe(input) || pipe(output)) exit(2);
    fcntl(output[0], F_SETFL, O_NONBLOCK);
    DeviceContext device = {.source_fd = input[0], .virtual_fd = output[1]};
    memset(physical_keys, 0, sizeof(physical_keys));
    fail_query = false;
    return device;
}
static void close_pipes(int input[2], int output[2]) {
    close(input[0]); close(input[1]); close(output[0]); close(output[1]);
}
static bool saw_key(int fd, int key, int value, bool *sync_seen) {
    struct input_event events[128];
    ssize_t bytes = read(fd, events, sizeof(events));
    bool saw = false;
    if (sync_seen) *sync_seen = false;
    for (size_t i = 0; bytes > 0 && i < (size_t)bytes / sizeof(events[0]); i++) {
        saw |= events[i].type == EV_KEY && events[i].code == key && events[i].value == value;
        if (sync_seen && is_syn_report(&events[i])) *sync_seen = true;
    }
    return saw;
}
static int feed(DeviceContext *device, int fd, Config *config,
                const struct input_event *events, size_t count) {
    if (write(fd, events, count * sizeof(*events)) != (ssize_t)(count * sizeof(*events))) exit(2);
    return handle_source(device, config);
}
int main(void) {
    int input[2], output[2];
    Config old = {0}, next = {0};
    old.fn_transform_sources[0] = KEY_F23;
    old.fn_transform_count = 1;
    index_config_keys(&old);
    index_config_keys(&next);
    DeviceContext device = open_device(input, output);
    struct input_event key = {.type = EV_KEY, .code = KEY_F23, .value = 1};
    handle_key_event(&device, &old, &key);
    check(saw_key(output[0], KEY_FN, 1, NULL), "Fn transform emits its canonical press");
    release_all_keys(&device);
    bool sync_seen;
    check(saw_key(output[0], KEY_FN, 0, &sync_seen) && sync_seen,
          "profile handoff releases Fn and commits it before the new profile");
    key.value = 0;
    handle_key_event(&device, &next, &key);
    close_pipes(input, output);

    device = open_device(input, output);
    struct input_event shift[] = {
        {.type = EV_KEY, .code = KEY_LEFTSHIFT, .value = 1},
        {.type = EV_SYN, .code = SYN_REPORT}
    };
    feed(&device, input[1], &next, shift, 2);
    check(saw_key(output[0], KEY_LEFTSHIFT, 1, NULL), "fast passthrough emits a real key press");
    release_all_keys(&device);
    check(saw_key(output[0], KEY_LEFTSHIFT, 0, &sync_seen) && sync_seen,
          "profile handoff also releases keys emitted by fast passthrough");
    close_pipes(input, output);

    Config mapped = {0};
    mapped.rule_count = 1;
    mapped.rules[0].action = RULE_ACTION_KEYS;
    mapped.rules[0].source[0] = KEY_A; mapped.rules[0].source_count = 1;
    mapped.rules[0].target[0] = KEY_B; mapped.rules[0].target_count = 1;
    index_config_keys(&mapped);
    device = open_device(input, output);
    struct input_event press[] = {
        {.type = EV_KEY, .code = KEY_A, .value = 1},
        {.type = EV_SYN, .code = SYN_REPORT}
    };
    feed(&device, input[1], &mapped, press, 2);
    check(saw_key(output[0], KEY_B, 1, NULL), "mapping emits its target press");
    struct input_event dropped[] = {
        {.type = EV_SYN, .code = SYN_DROPPED},
        {.type = EV_KEY, .code = KEY_C, .value = 1}
    };
    feed(&device, input[1], &mapped, dropped, 2);
    check(saw_key(output[0], KEY_B, 0, &sync_seen) && sync_seen,
          "lost physical release is replaced with target release and SYN_REPORT");
    check(device.target_refs[KEY_B] == 0 && !device.active_rules[0],
          "dropped input clears stale mapping state");
    struct input_event tail[] = {
        {.type = EV_KEY, .code = KEY_D, .value = 1},
        {.type = EV_SYN, .code = SYN_REPORT}
    };
    check(feed(&device, input[1], &mapped, tail, 2) == 0,
          "resynchronization reads the current physical state");
    check(read(output[0], tail, sizeof(tail)) < 0 && errno == EAGAIN,
          "incomplete events before the recovery SYN_REPORT are not forwarded");
    feed(&device, input[1], &mapped, press, 2);
    check(saw_key(output[0], KEY_B, 1, NULL), "fresh key press works after recovery");
    close_pipes(input, output);

    device = open_device(input, output);
    physical_keys[KEY_A / 8] |= 1U << (KEY_A % 8);
    physical_keys[KEY_LEFTSHIFT / 8] |= 1U << (KEY_LEFTSHIFT % 8);
    struct input_event reset[] = {
        {.type = EV_SYN, .code = SYN_DROPPED},
        {.type = EV_SYN, .code = SYN_REPORT}
    };
    feed(&device, input[1], &mapped, reset, 2);
    struct input_event held[] = {
        {.type = EV_KEY, .code = KEY_A, .value = 2},
        {.type = EV_KEY, .code = KEY_LEFTSHIFT, .value = 2},
        {.type = EV_SYN, .code = SYN_REPORT}
    };
    feed(&device, input[1], &mapped, held, 3);
    check(!saw_key(output[0], KEY_LEFTSHIFT, 2, NULL) && device.target_refs[KEY_B] == 0,
          "keys held across input loss do not repeat or launch mappings");
    held[0].value = held[1].value = 0;
    feed(&device, input[1], &mapped, held, 3);
    (void)saw_key(output[0], KEY_B, 0, NULL);
    feed(&device, input[1], &mapped, press, 2);
    check(saw_key(output[0], KEY_B, 1, NULL), "held source re-arms after its physical release");
    shift[0].value = 1;
    feed(&device, input[1], &mapped, shift, 2);
    check(saw_key(output[0], KEY_LEFTSHIFT, 1, NULL), "fast passthrough re-arms after release too");
    close_pipes(input, output);

    device = open_device(input, output);
    fail_query = true;
    check(feed(&device, input[1], &mapped, reset, 2) < 0,
          "failed physical-state query recreates the device instead of guessing");
    close_pipes(input, output);
    return failures ? 1 : 0;
}
