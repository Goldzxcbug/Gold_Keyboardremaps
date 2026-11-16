// Host regression test for keys that are both ordinary keys and chord sources.
//
// A key used in a chord must keep working as a normal keyboard key whenever the
// chord's prefix keys are not held. In particular, its press and autorepeat
// must reach the virtual keyboard immediately; deferring the press to key-up
// made Fn+1 swallow the 1 key and emit a single tap only when it was released.
//
// Built and run by tests/test_fn_remap_repeat.sh.

#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define main gold_daemon_main
#include "../fn_remap.c"
#undef main

static int failures;

static void check(bool ok, const char *what) {
    printf("%s %s\n", ok ? "ok  " : "FAIL", what);
    failures += !ok;
}

typedef struct {
    int read_fd;
    int write_fd;
    DeviceContext device;
} TestDevice;

static TestDevice open_test_device(void) {
    TestDevice test = {0};
    int fds[2];
    if (pipe(fds) != 0) {
        perror("pipe");
        exit(2);
    }
    int flags = fcntl(fds[0], F_GETFL, 0);
    (void)fcntl(fds[0], F_SETFL, flags | O_NONBLOCK);
    test.read_fd = fds[0];
    test.write_fd = fds[1];
    test.device.source_fd = -1;
    test.device.virtual_fd = fds[1];
    return test;
}

static void close_test_device(TestDevice *test) {
    close(test->read_fd);
    close(test->write_fd);
}

static size_t read_events(TestDevice *test, struct input_event *events, size_t capacity) {
    size_t count = 0;
    while (count < capacity) {
        ssize_t bytes = read(test->read_fd, events + count,
                             (capacity - count) * sizeof(*events));
        if (bytes <= 0) {
            break;
        }
        count += (size_t)bytes / sizeof(*events);
    }
    return count;
}

static int send_key(TestDevice *test, const Config *config, int code, int value) {
    struct input_event event;
    memset(&event, 0, sizeof(event));
    event.type = EV_KEY;
    event.code = (uint16_t)code;
    event.value = value;
    int result = handle_key_event(&test->device, config, &event);
    if (result == 0) {
        result = flush_forwarded_events(&test->device);
    }
    return result;
}

static bool saw_key(const struct input_event *events, size_t count, int code, int value) {
    for (size_t index = 0; index < count; index++) {
        if (events[index].type == EV_KEY && events[index].code == code &&
            events[index].value == value) {
            return true;
        }
    }
    return false;
}

static void init_fn_number_config(Config *config) {
    memset(config, 0, sizeof(*config));
    config->fn_transform_sources[0] = KEY_F23;
    config->fn_transform_count = 1;
    config->rule_count = 1;
    MappingRule *rule = &config->rules[0];
    rule->action = RULE_ACTION_KEYS;
    rule->source[0] = KEY_FN;
    rule->source[1] = KEY_1;
    rule->source_count = 2;
    rule->target[0] = KEY_F1;
    rule->target_count = 1;
    index_config_keys(config);
}

static void init_modifier_chord_config(Config *config) {
    memset(config, 0, sizeof(*config));
    config->rule_count = 1;
    MappingRule *rule = &config->rules[0];
    rule->action = RULE_ACTION_KEYS;
    rule->source[0] = KEY_LEFTCTRL;
    rule->source[1] = KEY_LEFTSHIFT;
    rule->source[2] = KEY_Z;
    rule->source_count = 3;
    rule->target[0] = KEY_C;
    rule->target_count = 1;
    index_config_keys(config);
}

static void init_printable_prefix_config(Config *config) {
    memset(config, 0, sizeof(*config));
    config->rule_count = 1;
    MappingRule *rule = &config->rules[0];
    rule->action = RULE_ACTION_KEYS;
    rule->source[0] = KEY_A;
    rule->source[1] = KEY_B;
    rule->source_count = 2;
    rule->target[0] = KEY_C;
    rule->target_count = 1;
    index_config_keys(config);
}

static void test_standalone_trigger(void) {
    printf("\n-- standalone trigger key --\n");
    Config config;
    init_fn_number_config(&config);
    TestDevice test = open_test_device();
    struct input_event events[32];

    check(send_key(&test, &config, KEY_1, 1) == 0, "1 press is accepted");
    size_t count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_1, 1), "1 press is emitted immediately");
    check(!saw_key(events, count, KEY_F1, 1), "1 press does not trigger F1 without Fn");

    check(send_key(&test, &config, KEY_1, 2) == 0, "1 repeat is accepted");
    count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_1, 2), "1 autorepeat is forwarded");
    check(!saw_key(events, count, KEY_F1, 2), "1 autorepeat does not become F1");

    check(send_key(&test, &config, KEY_1, 0) == 0, "1 release is accepted");
    count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_1, 0), "1 release is forwarded");
    check(!saw_key(events, count, KEY_F1, 0), "1 release does not release F1");

    // A profile switch or an input-loss reset must let go of a trigger key that
    // was delivered through the new fast path; otherwise it would stay down.
    check(send_key(&test, &config, KEY_1, 1) == 0, "1 press before a handoff is accepted");
    count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_1, 1), "the handoff press was delivered");
    check(release_all_keys(&test.device) == 0, "a handoff can release the forwarded trigger");
    count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_1, 0), "the forwarded trigger is released on handoff");
    check(!test.device.output_down[KEY_1], "the handoff clears the trigger's output state");

    close_test_device(&test);
}

static void test_fn_chord(void) {
    printf("\n-- Fn chord --\n");
    Config config;
    init_fn_number_config(&config);
    TestDevice test = open_test_device();
    struct input_event events[32];

    check(send_key(&test, &config, KEY_F23, 1) == 0, "Fn press is accepted");
    size_t count = read_events(&test, events, 32);
    check(count == 0, "Fn prefix stays silent while held");

    check(send_key(&test, &config, KEY_1, 1) == 0, "1 press with Fn is accepted");
    count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_F1, 1), "Fn+1 emits F1 press");
    check(!saw_key(events, count, KEY_1, 1), "Fn+1 does not leak 1 press");

    check(send_key(&test, &config, KEY_1, 2) == 0, "1 repeat with Fn is accepted");
    count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_F1, 2), "Fn+1 repeats F1");
    check(!saw_key(events, count, KEY_1, 2), "Fn+1 does not leak 1 repeat");

    check(send_key(&test, &config, KEY_1, 0) == 0, "1 release with Fn is accepted");
    count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_F1, 0), "Fn+1 releases F1");
    check(!saw_key(events, count, KEY_1, 0), "Fn+1 does not leak 1 release");

    check(send_key(&test, &config, KEY_F23, 0) == 0, "Fn release is accepted");
    count = read_events(&test, events, 32);
    check(count == 0, "Fn release stays silent");

    close_test_device(&test);
}

static void test_direct_fn_is_silent(void) {
    printf("\n-- direct Fn key --\n");
    Config config;
    init_fn_number_config(&config);
    TestDevice test = open_test_device();
    struct input_event events[32];

    check(send_key(&test, &config, KEY_FN, 1) == 0, "direct Fn press is accepted");
    size_t count = read_events(&test, events, 32);
    check(count == 0, "direct Fn press stays silent");

    check(send_key(&test, &config, KEY_FN, 0) == 0, "direct Fn release is accepted");
    count = read_events(&test, events, 32);
    check(count == 0, "direct Fn release stays silent");

    close_test_device(&test);
}

static void test_reverse_order(void) {
    printf("\n-- reverse order --\n");
    Config config;
    init_fn_number_config(&config);
    TestDevice test = open_test_device();
    struct input_event events[32];

    check(send_key(&test, &config, KEY_1, 1) == 0, "1 press before Fn is accepted");
    size_t count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_1, 1), "1 before Fn is delivered as 1");

    check(send_key(&test, &config, KEY_F23, 1) == 0, "Fn press after 1 is accepted");
    count = read_events(&test, events, 32);
    check(count == 0, "Fn pressed after 1 stays silent");
    check(!saw_key(events, count, KEY_F1, 1), "1 then Fn does not trigger F1");

    check(send_key(&test, &config, KEY_F23, 0) == 0, "Fn release after 1 is accepted");
    count = read_events(&test, events, 32);
    check(count == 0, "Fn release after 1 stays silent");

    check(send_key(&test, &config, KEY_1, 0) == 0, "1 release after Fn is accepted");
    count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_1, 0), "1 release after Fn is delivered as 1");

    close_test_device(&test);
}

static void test_modifier_chord(void) {
    printf("\n-- modifier chord --\n");
    Config config;
    init_modifier_chord_config(&config);
    TestDevice test = open_test_device();
    struct input_event events[32];

    check(send_key(&test, &config, KEY_LEFTCTRL, 1) == 0, "Ctrl press is accepted");
    size_t count = read_events(&test, events, 32);
    check(count == 0, "Ctrl prefix stays silent while held");

    check(send_key(&test, &config, KEY_LEFTSHIFT, 1) == 0, "Shift press is accepted");
    count = read_events(&test, events, 32);
    check(count == 0, "Shift prefix stays silent while held");

    check(send_key(&test, &config, KEY_Z, 1) == 0, "Z press is accepted");
    count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_C, 1), "Ctrl+Shift+Z emits C press");
    check(!saw_key(events, count, KEY_LEFTCTRL, 1) &&
          !saw_key(events, count, KEY_LEFTSHIFT, 1) &&
          !saw_key(events, count, KEY_Z, 1),
          "Ctrl+Shift+Z does not leak its source keys");

    check(send_key(&test, &config, KEY_Z, 2) == 0, "Z repeat is accepted");
    count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_C, 2), "Ctrl+Shift+Z repeats C");

    check(send_key(&test, &config, KEY_Z, 0) == 0, "Z release is accepted");
    count = read_events(&test, events, 32);
    check(saw_key(events, count, KEY_C, 0), "Ctrl+Shift+Z releases C");

    check(send_key(&test, &config, KEY_LEFTSHIFT, 0) == 0, "Shift release is accepted");
    count = read_events(&test, events, 32);
    check(count == 0, "Shift release stays silent");

    check(send_key(&test, &config, KEY_LEFTCTRL, 0) == 0, "Ctrl release is accepted");
    count = read_events(&test, events, 32);
    check(count == 0, "Ctrl release stays silent");
    check(test.device.target_refs[KEY_C] == 0, "the chord target is fully released");

    close_test_device(&test);
}

static void test_printable_prefix(void) {
    printf("\n-- printable prefix --\n");
    Config config;
    init_printable_prefix_config(&config);
    struct input_event events[32];
    size_t count;

    TestDevice chord = open_test_device();
    check(send_key(&chord, &config, KEY_A, 1) == 0, "A press is accepted");
    count = read_events(&chord, events, 32);
    check(count == 0, "A waits while B may still complete the chord");

    check(send_key(&chord, &config, KEY_B, 1) == 0, "B press is accepted");
    count = read_events(&chord, events, 32);
    check(saw_key(events, count, KEY_C, 1), "A+B emits C press");
    check(!saw_key(events, count, KEY_A, 1) && !saw_key(events, count, KEY_B, 1),
          "A+B does not leak its source keys");

    check(send_key(&chord, &config, KEY_B, 0) == 0, "B release is accepted");
    count = read_events(&chord, events, 32);
    check(saw_key(events, count, KEY_C, 0), "A+B releases C");

    check(send_key(&chord, &config, KEY_A, 0) == 0, "A release is accepted");
    count = read_events(&chord, events, 32);
    check(count == 0, "A release after the chord stays silent");
    close_test_device(&chord);

    TestDevice held = open_test_device();
    check(send_key(&held, &config, KEY_A, 1) == 0, "held A press is accepted");
    count = read_events(&held, events, 32);
    check(count == 0, "held A stays pending before its first repeat");

    check(send_key(&held, &config, KEY_A, 2) == 0, "held A repeat is accepted");
    count = read_events(&held, events, 32);
    check(saw_key(events, count, KEY_A, 1), "held A publishes its press when repeat starts");
    check(saw_key(events, count, KEY_A, 2), "held A forwards its autorepeat");

    check(send_key(&held, &config, KEY_B, 1) == 0, "B press after A started repeating is accepted");
    count = read_events(&held, events, 32);
    check(saw_key(events, count, KEY_B, 1), "B after A repeats is delivered as B");
    check(!saw_key(events, count, KEY_C, 1), "B after A repeats does not trigger A+B");

    check(send_key(&held, &config, KEY_B, 0) == 0, "B release after A repeats is accepted");
    count = read_events(&held, events, 32);
    check(saw_key(events, count, KEY_B, 0), "B after A repeats releases as B");

    check(send_key(&held, &config, KEY_A, 0) == 0, "A release after repeats is accepted");
    count = read_events(&held, events, 32);
    check(saw_key(events, count, KEY_A, 0), "A release after repeats is forwarded");
    close_test_device(&held);
}

int main(void) {
    test_standalone_trigger();
    test_fn_chord();
    test_direct_fn_is_silent();
    test_reverse_order();
    test_modifier_chord();
    test_printable_prefix();

    printf("\n%s\n", failures == 0 ? "all checks passed" : "there were failures");
    return failures == 0 ? 0 : 1;
}
