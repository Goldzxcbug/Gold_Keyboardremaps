// Kernel-level keyboard remapper with selectable devices and chord mappings.
#define _GNU_SOURCE

#include <ctype.h>
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <linux/input.h>
#include <linux/uinput.h>
#include <poll.h>
#include <signal.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

#define CONFIG_PATH "/data/adb/modules/Gold_Keyboardremaps/config.conf"
#define VIRTUAL_NAME_PREFIX "Gold Keyboardremaps"
#define COLOROS_WINDOW_LAUNCHER "/data/adb/modules/Gold_Keyboardremaps/bin/coloros-window-launcher.jar"
#define COLOROS_WINDOW_LAUNCHER_CLASS "gold.keyboardremaps.ColorOsWindowLauncher"
#define VIRTUAL_VENDOR 0x22d9
#define VIRTUAL_PRODUCT 0x386a
#define RETRY_DELAY_SECONDS 2
#define MAX_DEVICES 16
#define MAX_RULES 96
#define MAX_COMBO_KEYS 8
#define MAX_FN_TRANSFORMS 8
#define EVENT_SCAN_LIMIT 64

typedef struct {
    const char *name;
    int code;
} KeyName;

typedef enum {
    RULE_ACTION_KEYS,
    RULE_ACTION_LAUNCH_APP,
} RuleAction;

typedef struct {
    int source[MAX_COMBO_KEYS];
    size_t source_count;
    RuleAction action;
    int target[MAX_COMBO_KEYS];
    size_t target_count;
    char component[256];
    bool launch_freeform;
    bool close_on_repeat;
} MappingRule;

typedef struct {
    char path[64];
    unsigned int bus;
    unsigned int vendor;
    unsigned int product;
} DeviceSelector;

typedef struct {
    bool auto_select;
    DeviceSelector selectors[MAX_DEVICES];
    size_t selector_count;
    int fn_transform_sources[MAX_FN_TRANSFORMS];
    size_t fn_transform_count;
    MappingRule rules[MAX_RULES];
    size_t rule_count;
} Config;

typedef struct {
    int source_fd;
    int virtual_fd;
    char source_path[64];
    char source_name[128];
    bool pressed[KEY_MAX + 1];
    bool pending[KEY_MAX + 1];
    bool suppressed[KEY_MAX + 1];
    bool forwarded[KEY_MAX + 1];
    bool active_rules[MAX_RULES];
    unsigned int target_refs[KEY_MAX + 1];
} DeviceContext;

static volatile sig_atomic_t keep_running = 1;

static const KeyName k_key_names[] = {
    {"KEY_ESC", KEY_ESC}, {"KEY_1", KEY_1}, {"KEY_2", KEY_2},
    {"KEY_3", KEY_3}, {"KEY_4", KEY_4}, {"KEY_5", KEY_5},
    {"KEY_6", KEY_6}, {"KEY_7", KEY_7}, {"KEY_8", KEY_8},
    {"KEY_9", KEY_9}, {"KEY_0", KEY_0}, {"KEY_MINUS", KEY_MINUS},
    {"KEY_EQUAL", KEY_EQUAL}, {"KEY_BACKSPACE", KEY_BACKSPACE},
    {"KEY_TAB", KEY_TAB}, {"KEY_Q", KEY_Q}, {"KEY_W", KEY_W},
    {"KEY_E", KEY_E}, {"KEY_R", KEY_R}, {"KEY_T", KEY_T},
    {"KEY_Y", KEY_Y}, {"KEY_U", KEY_U}, {"KEY_I", KEY_I},
    {"KEY_O", KEY_O}, {"KEY_P", KEY_P},
    {"KEY_LEFTBRACE", KEY_LEFTBRACE}, {"KEY_RIGHTBRACE", KEY_RIGHTBRACE},
    {"KEY_ENTER", KEY_ENTER}, {"KEY_LEFTCTRL", KEY_LEFTCTRL},
    {"KEY_A", KEY_A}, {"KEY_S", KEY_S}, {"KEY_D", KEY_D},
    {"KEY_F", KEY_F}, {"KEY_G", KEY_G}, {"KEY_H", KEY_H},
    {"KEY_J", KEY_J}, {"KEY_K", KEY_K}, {"KEY_L", KEY_L},
    {"KEY_SEMICOLON", KEY_SEMICOLON}, {"KEY_APOSTROPHE", KEY_APOSTROPHE},
    {"KEY_GRAVE", KEY_GRAVE}, {"KEY_LEFTSHIFT", KEY_LEFTSHIFT},
    {"KEY_BACKSLASH", KEY_BACKSLASH}, {"KEY_Z", KEY_Z}, {"KEY_X", KEY_X},
    {"KEY_C", KEY_C}, {"KEY_V", KEY_V}, {"KEY_B", KEY_B},
    {"KEY_N", KEY_N}, {"KEY_M", KEY_M}, {"KEY_COMMA", KEY_COMMA},
    {"KEY_DOT", KEY_DOT}, {"KEY_SLASH", KEY_SLASH},
    {"KEY_RIGHTSHIFT", KEY_RIGHTSHIFT}, {"KEY_LEFTALT", KEY_LEFTALT},
    {"KEY_SPACE", KEY_SPACE}, {"KEY_CAPSLOCK", KEY_CAPSLOCK},
    {"KEY_KPASTERISK", KEY_KPASTERISK},
    {"KEY_F1", KEY_F1}, {"KEY_F2", KEY_F2}, {"KEY_F3", KEY_F3},
    {"KEY_F4", KEY_F4}, {"KEY_F5", KEY_F5}, {"KEY_F6", KEY_F6},
    {"KEY_F7", KEY_F7}, {"KEY_F8", KEY_F8}, {"KEY_F9", KEY_F9},
    {"KEY_F10", KEY_F10}, {"KEY_NUMLOCK", KEY_NUMLOCK},
    {"KEY_KP7", KEY_KP7}, {"KEY_KP8", KEY_KP8}, {"KEY_KP9", KEY_KP9},
    {"KEY_KPMINUS", KEY_KPMINUS}, {"KEY_KP4", KEY_KP4}, {"KEY_KP5", KEY_KP5},
    {"KEY_KP6", KEY_KP6}, {"KEY_KPPLUS", KEY_KPPLUS}, {"KEY_KP1", KEY_KP1},
    {"KEY_KP2", KEY_KP2}, {"KEY_KP3", KEY_KP3}, {"KEY_KP0", KEY_KP0},
    {"KEY_KPDOT", KEY_KPDOT}, {"KEY_SYSRQ", KEY_SYSRQ},
    {"KEY_SCROLLLOCK", KEY_SCROLLLOCK}, {"KEY_PAUSE", KEY_PAUSE}, {"KEY_F11", KEY_F11},
    {"KEY_F12", KEY_F12},
    {"KEY_KPENTER", KEY_KPENTER}, {"KEY_RIGHTCTRL", KEY_RIGHTCTRL},
    {"KEY_KPSLASH", KEY_KPSLASH},
    {"KEY_RIGHTALT", KEY_RIGHTALT}, {"KEY_HOME", KEY_HOME},
    {"KEY_UP", KEY_UP}, {"KEY_PAGEUP", KEY_PAGEUP}, {"KEY_LEFT", KEY_LEFT},
    {"KEY_RIGHT", KEY_RIGHT}, {"KEY_END", KEY_END}, {"KEY_DOWN", KEY_DOWN},
    {"KEY_PAGEDOWN", KEY_PAGEDOWN}, {"KEY_INSERT", KEY_INSERT},
    {"KEY_DELETE", KEY_DELETE}, {"KEY_MUTE", KEY_MUTE},
    {"KEY_VOLUMEDOWN", KEY_VOLUMEDOWN}, {"KEY_VOLUMEUP", KEY_VOLUMEUP},
    {"KEY_LEFTMETA", KEY_LEFTMETA}, {"KEY_RIGHTMETA", KEY_RIGHTMETA},
    {"KEY_COMPOSE", KEY_COMPOSE}, {"KEY_F13", KEY_F13}, {"KEY_F14", KEY_F14},
    {"KEY_F15", KEY_F15}, {"KEY_F16", KEY_F16}, {"KEY_F17", KEY_F17},
    {"KEY_F18", KEY_F18}, {"KEY_F19", KEY_F19}, {"KEY_F20", KEY_F20},
    {"KEY_F21", KEY_F21}, {"KEY_F22", KEY_F22}, {"KEY_F23", KEY_F23},
    {"KEY_F24", KEY_F24}, {"KEY_FN", KEY_FN},
    {"KEY_BRIGHTNESSDOWN", KEY_BRIGHTNESSDOWN},
    {"KEY_BRIGHTNESSUP", KEY_BRIGHTNESSUP}, {"KEY_PLAYPAUSE", KEY_PLAYPAUSE},
    {"KEY_NEXTSONG", KEY_NEXTSONG}, {"KEY_PREVIOUSSONG", KEY_PREVIOUSSONG},
    {"KEY_BACK", KEY_BACK}, {"KEY_MENU", KEY_MENU}, {"KEY_SEARCH", KEY_SEARCH},
    {"BTN_LEFT", BTN_LEFT}, {"BTN_RIGHT", BTN_RIGHT}, {"BTN_MIDDLE", BTN_MIDDLE},
    {"BTN_SIDE", BTN_SIDE}, {"BTN_EXTRA", BTN_EXTRA}, {"BTN_TOUCH", BTN_TOUCH},
    {"BTN_TOOL_PEN", BTN_TOOL_PEN}, {"BTN_TOOL_RUBBER", BTN_TOOL_RUBBER},
    {"BTN_TOOL_BRUSH", BTN_TOOL_BRUSH}, {"BTN_TOOL_PENCIL", BTN_TOOL_PENCIL},
    {"BTN_TOOL_AIRBRUSH", BTN_TOOL_AIRBRUSH}, {"BTN_TOOL_FINGER", BTN_TOOL_FINGER},
    {"BTN_TOOL_MOUSE", BTN_TOOL_MOUSE}, {"BTN_TOOL_LENS", BTN_TOOL_LENS},
    {"BTN_TOOL_DOUBLETAP", BTN_TOOL_DOUBLETAP}, {"BTN_TOOL_TRIPLETAP", BTN_TOOL_TRIPLETAP},
};

static void stop(int signal_number) {
    (void)signal_number;
    keep_running = 0;
}

static void sleep_seconds(unsigned int seconds) {
    struct timespec delay = {.tv_sec = seconds, .tv_nsec = 0};
    while (nanosleep(&delay, &delay) == -1 && errno == EINTR && keep_running) {
    }
}

static bool bit_is_set(const uint8_t *bits, unsigned int bit) {
    return (bits[bit / 8] & (1U << (bit % 8))) != 0;
}

static char *trim(char *text) {
    while (isspace((unsigned char)*text)) {
        text++;
    }
    char *end = text + strlen(text);
    while (end > text && isspace((unsigned char)end[-1])) {
        *--end = '\0';
    }
    return text;
}

static int key_code_from_name(const char *name) {
    if (name == NULL || *name == '\0') {
        return -1;
    }
    for (size_t index = 0; index < sizeof(k_key_names) / sizeof(k_key_names[0]); index++) {
        if (strcmp(name, k_key_names[index].name) == 0) {
            return k_key_names[index].code;
        }
    }

    const char *numeric_text = name;
    if (strncmp(name, "CODE_", 5) == 0) {
        numeric_text = name + 5;
    }
    char *end = NULL;
    long numeric = strtol(numeric_text, &end, 0);
    if (end != numeric_text && *end == '\0' && numeric >= 0 && numeric <= KEY_MAX) {
        return (int)numeric;
    }
    return -1;
}

static bool parse_combo(char *text, int output[MAX_COMBO_KEYS], size_t *count) {
    size_t parsed = 0;
    char *save_pointer = NULL;
    for (char *token = strtok_r(text, "+", &save_pointer); token != NULL;
         token = strtok_r(NULL, "+", &save_pointer)) {
        if (parsed == MAX_COMBO_KEYS) {
            return false;
        }
        int key = key_code_from_name(trim(token));
        if (key < 0) {
            return false;
        }
        bool duplicate = false;
        for (size_t index = 0; index < parsed; index++) {
            if (output[index] == key) {
                duplicate = true;
                break;
            }
        }
        if (!duplicate) {
            output[parsed++] = key;
        }
    }
    *count = parsed;
    return parsed != 0;
}

static bool add_mapping(Config *config, const char *mapping_text) {
    char text[256];
    snprintf(text, sizeof(text), "%s", mapping_text);
    char *separator = strstr(text, "=>");
    if (separator == NULL) {
        return false;
    }
    *separator = '\0';
    char *source_text = trim(text);
    char *target_text = trim(separator + 2);
    MappingRule rule = {0};
    if (!parse_combo(source_text, rule.source, &rule.source_count) ||
        !parse_combo(target_text, rule.target, &rule.target_count)) {
        return false;
    }
    if (rule.source_count == 1 && rule.target_count == 1 && rule.target[0] == KEY_FN) {
        if (config->fn_transform_count == MAX_FN_TRANSFORMS || rule.source[0] == KEY_FN) {
            return false;
        }
        for (size_t index = 0; index < config->fn_transform_count; index++) {
            if (config->fn_transform_sources[index] == rule.source[0]) {
                return true;
            }
        }
        config->fn_transform_sources[config->fn_transform_count++] = rule.source[0];
        return true;
    }
    if (config->rule_count == MAX_RULES) {
        return false;
    }
    config->rules[config->rule_count++] = rule;
    return true;
}

static bool component_is_safe(const char *component) {
    const char *slash = NULL;
    if (*component == '\0') {
        return false;
    }
    for (const char *cursor = component; *cursor != '\0'; cursor++) {
        unsigned char character = (unsigned char)*cursor;
        if (character == '/') {
            if (slash != NULL) {
                return false;
            }
            slash = cursor;
            continue;
        }
        if (!isalnum(character) && character != '.' && character != '_' && character != '$') {
            return false;
        }
    }
    return slash != NULL && slash != component && slash[1] != '\0';
}

static bool add_launch_rule(Config *config, const char *launch_text) {
    if (config->rule_count == MAX_RULES) {
        return false;
    }
    char text[384];
    snprintf(text, sizeof(text), "%s", launch_text);
    char *separator = strstr(text, "=>");
    if (separator == NULL) {
        return false;
    }
    *separator = '\0';
    char *source_text = trim(text);
    char *destination = trim(separator + 2);
    char *option_separator = strchr(destination, '|');
    bool freeform = false;
    bool close_on_repeat = false;
    if (option_separator != NULL) {
        *option_separator = '\0';
        char *option = trim(option_separator + 1);
        char *repeat_separator = strchr(option, '|');
        if (repeat_separator != NULL) {
            *repeat_separator = '\0';
            if (strcmp(trim(repeat_separator + 1), "toggle") != 0) {
                return false;
            }
            close_on_repeat = true;
        }
        if (strcmp(option, "freeform") == 0) {
            freeform = true;
        } else if (strcmp(option, "normal") != 0) {
            return false;
        }
    }
    destination = trim(destination);
    if (!component_is_safe(destination) || strlen(destination) >= sizeof(((MappingRule *)0)->component)) {
        return false;
    }
    MappingRule rule = {
        .action = RULE_ACTION_LAUNCH_APP,
        .launch_freeform = freeform,
        .close_on_repeat = close_on_repeat,
    };
    if (!parse_combo(source_text, rule.source, &rule.source_count)) {
        return false;
    }
    snprintf(rule.component, sizeof(rule.component), "%s", destination);
    config->rules[config->rule_count++] = rule;
    return true;
}

static void add_default_mappings(Config *config) {
    static const char *const mappings[] = {
        "KEY_F23=>KEY_FN",
        "KEY_FN+KEY_1=>KEY_F1", "KEY_FN+KEY_2=>KEY_F2",
        "KEY_FN+KEY_3=>KEY_F3", "KEY_FN+KEY_4=>KEY_F4",
        "KEY_FN+KEY_5=>KEY_F5", "KEY_FN+KEY_6=>KEY_F6",
        "KEY_FN+KEY_7=>KEY_F7", "KEY_FN+KEY_8=>KEY_F8",
        "KEY_FN+KEY_9=>KEY_F9", "KEY_FN+KEY_0=>KEY_F10",
        "KEY_FN+KEY_MINUS=>KEY_F11", "KEY_FN+KEY_EQUAL=>KEY_F12",
    };
    for (size_t index = 0; index < sizeof(mappings) / sizeof(mappings[0]); index++) {
        (void)add_mapping(config, mappings[index]);
    }
}

static bool parse_device_selector(Config *config, char *text) {
    if (config->selector_count == MAX_DEVICES) {
        return false;
    }
    DeviceSelector selector = {0};
    char *save_pointer = NULL;
    char *path = strtok_r(text, "|", &save_pointer);
    char *bus = strtok_r(NULL, "|", &save_pointer);
    char *vendor = strtok_r(NULL, "|", &save_pointer);
    char *product = strtok_r(NULL, "|", &save_pointer);
    if (path == NULL || bus == NULL || vendor == NULL || product == NULL ||
        strncmp(path, "/dev/input/event", 16) != 0) {
        return false;
    }
    snprintf(selector.path, sizeof(selector.path), "%s", path);
    selector.bus = (unsigned int)strtoul(bus, NULL, 16);
    selector.vendor = (unsigned int)strtoul(vendor, NULL, 16);
    selector.product = (unsigned int)strtoul(product, NULL, 16);
    config->selectors[config->selector_count++] = selector;
    return true;
}

static void load_config(Config *config) {
    memset(config, 0, sizeof(*config));
    config->auto_select = true;

    FILE *file = fopen(CONFIG_PATH, "r");
    if (file == NULL) {
        add_default_mappings(config);
        return;
    }

    config->auto_select = false;
    char line[384];
    while (fgets(line, sizeof(line), file) != NULL) {
        char *value = trim(line);
        if (*value == '\0' || *value == '#') {
            continue;
        }
        if (strncmp(value, "device=", 7) == 0) {
            char *device = trim(value + 7);
            if (strcmp(device, "auto") == 0) {
                config->auto_select = true;
            } else {
                (void)parse_device_selector(config, device);
            }
        } else if (strncmp(value, "mapping=", 8) == 0) {
            (void)add_mapping(config, trim(value + 8));
        } else if (strncmp(value, "launch=", 7) == 0) {
            (void)add_launch_rule(config, trim(value + 7));
        }
    }
    fclose(file);

    if (config->selector_count == 0 && !config->auto_select) {
        config->auto_select = true;
    }
}

static bool is_virtual_name(const char *name) {
    return strncmp(name, VIRTUAL_NAME_PREFIX, strlen(VIRTUAL_NAME_PREFIX)) == 0;
}

static const char *key_name_from_code(int code) {
    for (size_t index = 0; index < sizeof(k_key_names) / sizeof(k_key_names[0]); index++) {
        if (k_key_names[index].code == code) {
            return k_key_names[index].name;
        }
    }
    return NULL;
}

static bool read_device_info(int fd, char *name, size_t name_size, struct input_id *id) {
    memset(name, 0, name_size);
    memset(id, 0, sizeof(*id));
    return ioctl(fd, EVIOCGNAME(name_size), name) >= 0 && ioctl(fd, EVIOCGID, id) >= 0;
}

static bool has_key_events(int fd) {
    uint8_t key_bits[(KEY_MAX + 8) / 8] = {0};
    if (ioctl(fd, EVIOCGBIT(EV_KEY, sizeof(key_bits)), key_bits) < 0) {
        return false;
    }
    for (size_t index = 0; index < sizeof(key_bits); index++) {
        if (key_bits[index] != 0) {
            return true;
        }
    }
    return false;
}

static bool contains_text(const char *text, const char *needle) {
    char lower[128];
    snprintf(lower, sizeof(lower), "%s", text);
    for (char *cursor = lower; *cursor != '\0'; cursor++) {
        *cursor = (char)tolower((unsigned char)*cursor);
    }
    return strstr(lower, needle) != NULL;
}

static bool is_auto_keyboard(int fd, const char *name) {
    if (!has_key_events(fd)) {
        return false;
    }
    if (contains_text(name, "touch") || contains_text(name, "pencil") ||
        contains_text(name, "stylus") || contains_text(name, "consumer") ||
        contains_text(name, "power") || contains_text(name, "volume")) {
        return false;
    }
    return contains_text(name, "keyboard") || contains_text(name, "keypad") ||
           contains_text(name, "kbd") || contains_text(name, "hid");
}

static bool is_button_input_code(unsigned int code) {
    return (code >= BTN_MISC && code <= BTN_GEAR_DOWN) ||
           (code >= BTN_DPAD_UP && code <= BTN_DPAD_RIGHT) ||
           (code >= BTN_TRIGGER_HAPPY1 && code <= BTN_TRIGGER_HAPPY40);
}

static bool matches_selector(const struct input_id *id, const DeviceSelector *selector) {
    return id->bustype == selector->bus && id->vendor == selector->vendor &&
           id->product == selector->product;
}

static bool is_capture_keyboard(const Config *config, int fd, const char *name,
                                const struct input_id *id) {
    if (!is_auto_keyboard(fd, name)) {
        return false;
    }
    if (config->auto_select) {
        return true;
    }
    for (size_t index = 0; index < config->selector_count; index++) {
        if (matches_selector(id, &config->selectors[index])) {
            return true;
        }
    }
    return false;
}

static int open_source(const char *path, char *name, size_t name_size, struct input_id *id) {
    int fd = open(path, O_RDWR | O_NONBLOCK | O_CLOEXEC);
    if (fd < 0) {
        return -1;
    }
    if (!read_device_info(fd, name, name_size, id) || is_virtual_name(name)) {
        close(fd);
        return -1;
    }
    return fd;
}

static bool source_already_open(const DeviceContext devices[MAX_DEVICES], size_t count,
                                const char *path) {
    for (size_t index = 0; index < count; index++) {
        if (strcmp(devices[index].source_path, path) == 0) {
            return true;
        }
    }
    return false;
}

static int write_event(int fd, const struct input_event *event) {
    const uint8_t *data = (const uint8_t *)event;
    size_t remaining = sizeof(*event);
    while (remaining != 0) {
        ssize_t written = write(fd, data, remaining);
        if (written > 0) {
            data += written;
            remaining -= (size_t)written;
        } else if (written < 0 && errno == EINTR) {
            continue;
        } else {
            return -1;
        }
    }
    return 0;
}

static bool is_mapping_target(const Config *config, int key) {
    for (size_t rule_index = 0; rule_index < config->rule_count; rule_index++) {
        const MappingRule *rule = &config->rules[rule_index];
        for (size_t key_index = 0; key_index < rule->target_count; key_index++) {
            if (rule->target[key_index] == key) {
                return true;
            }
        }
    }
    return false;
}

static int create_virtual_keyboard(int source_fd, const Config *config, const char *source_path) {
    uint8_t key_bits[(KEY_MAX + 8) / 8] = {0};
    uint8_t led_bits[(LED_MAX + 8) / 8] = {0};
    if (ioctl(source_fd, EVIOCGBIT(EV_KEY, sizeof(key_bits)), key_bits) < 0) {
        return -1;
    }

    int fd = open("/dev/uinput", O_RDWR | O_NONBLOCK | O_CLOEXEC);
    if (fd < 0 || ioctl(fd, UI_SET_EVBIT, EV_KEY) < 0) {
        if (fd >= 0) {
            close(fd);
        }
        return -1;
    }

    for (int key = 0; key <= KEY_MAX; key++) {
        if (!bit_is_set(key_bits, (unsigned int)key) && !is_mapping_target(config, key)) {
            continue;
        }
        if (ioctl(fd, UI_SET_KEYBIT, key) < 0) {
            close(fd);
            return -1;
        }
    }
    if (ioctl(source_fd, EVIOCGBIT(EV_LED, sizeof(led_bits)), led_bits) >= 0) {
        if (ioctl(fd, UI_SET_EVBIT, EV_LED) < 0) {
            close(fd);
            return -1;
        }
        for (int led = 0; led <= LED_MAX; led++) {
            if (bit_is_set(led_bits, (unsigned int)led) &&
                ioctl(fd, UI_SET_LEDBIT, led) < 0) {
                close(fd);
                return -1;
            }
        }
    }

    const char *event_name = strrchr(source_path, '/');
    struct uinput_setup setup = {0};
    snprintf(setup.name, sizeof(setup.name), "%s %s", VIRTUAL_NAME_PREFIX,
             event_name == NULL ? source_path : event_name + 1);
    setup.id.bustype = BUS_USB;
    setup.id.vendor = VIRTUAL_VENDOR;
    setup.id.product = VIRTUAL_PRODUCT;
    setup.id.version = 0x0101;
    if (ioctl(fd, UI_DEV_SETUP, &setup) < 0 || ioctl(fd, UI_DEV_CREATE) < 0) {
        close(fd);
        return -1;
    }
    return fd;
}

static bool rule_contains(const MappingRule *rule, int key) {
    for (size_t index = 0; index < rule->source_count; index++) {
        if (rule->source[index] == key) {
            return true;
        }
    }
    return false;
}

static bool key_is_mapping_source(const Config *config, int key) {
    for (size_t index = 0; index < config->rule_count; index++) {
        if (rule_contains(&config->rules[index], key)) {
            return true;
        }
    }
    return false;
}

static bool is_modifier_key(int key) {
    switch (key) {
        case KEY_LEFTCTRL:
        case KEY_RIGHTCTRL:
        case KEY_LEFTSHIFT:
        case KEY_RIGHTSHIFT:
        case KEY_LEFTALT:
        case KEY_RIGHTALT:
        case KEY_LEFTMETA:
        case KEY_RIGHTMETA:
        case KEY_COMPOSE:
            return true;
        default:
            return false;
    }
}

static bool is_app_modifier_source(const Config *config, int key) {
    if (!is_modifier_key(key)) {
        return false;
    }
    for (size_t index = 0; index < config->rule_count; index++) {
        const MappingRule *rule = &config->rules[index];
        if (rule->action == RULE_ACTION_LAUNCH_APP && rule_contains(rule, key)) {
            return true;
        }
    }
    return false;
}

static int canonical_key(const Config *config, int key) {
    for (size_t index = 0; index < config->fn_transform_count; index++) {
        if (config->fn_transform_sources[index] == key) {
            return KEY_FN;
        }
    }
    return key;
}

static bool rule_is_complete(const MappingRule *rule, const DeviceContext *device) {
    for (size_t index = 0; index < rule->source_count; index++) {
        if (!device->pressed[rule->source[index]]) {
            return false;
        }
    }
    return true;
}

static int matching_rule(const Config *config, const DeviceContext *device, int trigger_key) {
    int selected = -1;
    size_t selected_size = 0;
    for (size_t index = 0; index < config->rule_count; index++) {
        const MappingRule *rule = &config->rules[index];
        if (device->active_rules[index] || !rule_contains(rule, trigger_key) ||
            !rule_is_complete(rule, device)) {
            continue;
        }
        if (rule->source_count > selected_size) {
            selected = (int)index;
            selected_size = rule->source_count;
        }
    }
    return selected;
}

static int emit_key(DeviceContext *device, const struct input_event *original, int key, int value) {
    struct input_event output = *original;
    output.type = EV_KEY;
    output.code = (uint16_t)key;
    output.value = value;
    return write_event(device->virtual_fd, &output);
}

static int press_rule_target(DeviceContext *device, const MappingRule *rule,
                             const struct input_event *original) {
    for (size_t index = 0; index < rule->target_count; index++) {
        int key = rule->target[index];
        if (device->target_refs[key]++ == 0 && emit_key(device, original, key, 1) < 0) {
            return -1;
        }
    }
    return 0;
}

static void launch_rule_app(const MappingRule *rule) {
    char command[1024];
    int length;

    if (rule->launch_freeform) {
        length = snprintf(command, sizeof(command),
                          "CLASSPATH='%s' exec /system/bin/app_process /system/bin %s '%s' %s",
                          COLOROS_WINDOW_LAUNCHER, COLOROS_WINDOW_LAUNCHER_CLASS,
                          rule->component, rule->close_on_repeat ? "toggle" : "open");
    } else if (rule->close_on_repeat) {
        char package[256];
        const char *slash = strchr(rule->component, '/');
        size_t package_length = (size_t)(slash - rule->component);
        memcpy(package, rule->component, package_length);
        package[package_length] = '\0';
        length = snprintf(command, sizeof(command),
                          "top_component=$(/system/bin/dumpsys activity top 2>/dev/null | "
                          "/system/bin/sed -n '/^[[:space:]]*ACTIVITY / { "
                          "s/^[[:space:]]*ACTIVITY \\([^[:space:]]*\\).*/\\1/; h; }; "
                          "/mResumed=true/ { x; p; q; }'); "
                          "case \"$top_component\" in '%s/'*) "
                          "exec /system/bin/am start -a android.intent.action.MAIN "
                          "-c android.intent.category.HOME ;; *) "
                          "exec /system/bin/am start -n '%s' ;; esac",
                          package, rule->component);
    } else {
        length = snprintf(command, sizeof(command), "exec /system/bin/am start -n '%s'",
                          rule->component);
    }

    if (length < 0 || (size_t)length >= sizeof(command)) {
        fprintf(stderr, "fn-remap: launch command is too long for %s\n", rule->component);
        return;
    }

    pid_t child = fork();
    if (child < 0) {
        fprintf(stderr, "fn-remap: cannot launch %s: %s\n", rule->component, strerror(errno));
        return;
    }
    if (child != 0) {
        return;
    }

    // cmd activity transfers its standard streams over Binder. Module log files
    // cannot be transferred to system_server reliably, so use stable null FDs.
    int null_fd = open("/dev/null", O_RDWR | O_CLOEXEC);
    if (null_fd < 0 || dup2(null_fd, STDIN_FILENO) < 0 ||
        dup2(null_fd, STDOUT_FILENO) < 0 || dup2(null_fd, STDERR_FILENO) < 0) {
        if (null_fd >= 0) {
            close(null_fd);
        }
        _exit(127);
    }
    if (null_fd > STDERR_FILENO) {
        close(null_fd);
    }

    setenv("PATH", "/system/bin:/system/xbin:/product/bin:/system_ext/bin:/vendor/bin:"
                   "/vendor/xbin:/odm/bin:/data/adb/ksu/bin", 1);
    setenv("ANDROID_ROOT", "/system", 1);
    setenv("ANDROID_DATA", "/data", 1);
    signal(SIGCHLD, SIG_DFL);
    execl("/system/bin/su", "su", "-c", command, (char *)NULL);
    fprintf(stderr, "fn-remap: cannot execute su for %s: %s\n", rule->component, strerror(errno));
    _exit(127);
}

static int repeat_rule_target(DeviceContext *device, const MappingRule *rule,
                              const struct input_event *original) {
    for (size_t index = 0; index < rule->target_count; index++) {
        int key = rule->target[index];
        if (device->target_refs[key] != 0 && emit_key(device, original, key, 2) < 0) {
            return -1;
        }
    }
    return 0;
}

static int release_rule_target(DeviceContext *device, const MappingRule *rule,
                               const struct input_event *original) {
    for (size_t index = rule->target_count; index > 0; index--) {
        int key = rule->target[index - 1];
        if (device->target_refs[key] != 0 && --device->target_refs[key] == 0 &&
            emit_key(device, original, key, 0) < 0) {
            return -1;
        }
    }
    return 0;
}

static int activate_rule(DeviceContext *device, const Config *config, size_t rule_index,
                         const struct input_event *event) {
    const MappingRule *rule = &config->rules[rule_index];
    device->active_rules[rule_index] = true;
    for (size_t index = 0; index < rule->source_count; index++) {
        int key = rule->source[index];
        device->pending[key] = false;
        device->suppressed[key] = !device->forwarded[key];
    }
    if (rule->action == RULE_ACTION_LAUNCH_APP) {
        launch_rule_app(rule);
        return 0;
    }
    return press_rule_target(device, rule, event);
}

static int handle_key_event(DeviceContext *device, const Config *config,
                            const struct input_event *event) {
    int raw_key = event->code;
    if (raw_key < 0 || raw_key > KEY_MAX) {
        return write_event(device->virtual_fd, event);
    }
    int key = canonical_key(config, raw_key);
    bool transformed_key = key != raw_key;
    bool mapping_source = key_is_mapping_source(config, key);

    if (event->value == 1) {
        device->pressed[key] = true;
        int rule = matching_rule(config, device, key);
        if (rule >= 0) {
            return activate_rule(device, config, (size_t)rule, event);
        }
        if (mapping_source) {
            if (is_app_modifier_source(config, key)) {
                device->forwarded[key] = true;
                return write_event(device->virtual_fd, event);
            }
            device->pending[key] = true;
            return 0;
        }
        return write_event(device->virtual_fd, event);
    }

    if (event->value == 2) {
        for (size_t index = 0; index < config->rule_count; index++) {
            if (device->active_rules[index] && rule_contains(&config->rules[index], key) &&
                config->rules[index].action == RULE_ACTION_KEYS &&
                repeat_rule_target(device, &config->rules[index], event) < 0) {
                return -1;
            }
        }
        return mapping_source || transformed_key ? 0 : write_event(device->virtual_fd, event);
    }

    if (event->value == 0) {
        for (size_t index = 0; index < config->rule_count; index++) {
            if (device->active_rules[index] && rule_contains(&config->rules[index], key)) {
                device->active_rules[index] = false;
                if (config->rules[index].action == RULE_ACTION_KEYS &&
                    release_rule_target(device, &config->rules[index], event) < 0) {
                    return -1;
                }
            }
        }
        device->pressed[key] = false;
        if (device->suppressed[key]) {
            device->suppressed[key] = false;
            device->pending[key] = false;
            device->forwarded[key] = false;
            return 0;
        }
        if (mapping_source && device->pending[key]) {
            device->pending[key] = false;
            if (transformed_key) {
                return 0;
            }
            if (emit_key(device, event, key, 1) < 0) {
                return -1;
            }
        }
        device->forwarded[key] = false;
        return transformed_key ? 0 : write_event(device->virtual_fd, event);
    }

    return transformed_key ? 0 : write_event(device->virtual_fd, event);
}

static int handle_source(DeviceContext *device, const Config *config) {
    struct input_event events[32];
    ssize_t count = read(device->source_fd, events, sizeof(events));
    if (count <= 0) {
        return count < 0 && (errno == EAGAIN || errno == EINTR) ? 0 : -1;
    }
    for (ssize_t index = 0; index < count / (ssize_t)sizeof(struct input_event); index++) {
        const struct input_event *event = &events[index];
        if (event->type == EV_MSC && event->code == MSC_SCAN) {
            continue;
        }
        int result = event->type == EV_KEY ? handle_key_event(device, config, event)
                                            : write_event(device->virtual_fd, event);
        if (result < 0) {
            return -1;
        }
    }
    return 0;
}

static int handle_virtual_output(DeviceContext *device) {
    struct input_event events[16];
    ssize_t count = read(device->virtual_fd, events, sizeof(events));
    if (count <= 0) {
        return count < 0 && (errno == EAGAIN || errno == EINTR) ? 0 : -1;
    }
    for (ssize_t index = 0; index < count / (ssize_t)sizeof(struct input_event); index++) {
        if (events[index].type == EV_LED && write_event(device->source_fd, &events[index]) < 0) {
            return -1;
        }
    }
    return 0;
}

static void close_device(DeviceContext *device) {
    if (device->source_fd >= 0) {
        (void)ioctl(device->source_fd, EVIOCGRAB, 0);
    }
    if (device->virtual_fd >= 0) {
        (void)ioctl(device->virtual_fd, UI_DEV_DESTROY);
        close(device->virtual_fd);
    }
    if (device->source_fd >= 0) {
        close(device->source_fd);
    }
    device->source_fd = -1;
    device->virtual_fd = -1;
}

static bool add_device(DeviceContext devices[MAX_DEVICES], size_t *count, int source_fd,
                       const char *source_path, const char *source_name, const Config *config) {
    if (*count == MAX_DEVICES || source_already_open(devices, *count, source_path)) {
        close(source_fd);
        return false;
    }
    DeviceContext device = {.source_fd = source_fd, .virtual_fd = -1};
    snprintf(device.source_path, sizeof(device.source_path), "%s", source_path);
    snprintf(device.source_name, sizeof(device.source_name), "%s", source_name);
    device.virtual_fd = create_virtual_keyboard(source_fd, config, source_path);
    if (device.virtual_fd < 0) {
        fprintf(stderr, "fn-remap: cannot create virtual keyboard for %s: %s\n", source_path,
                strerror(errno));
        close(source_fd);
        return false;
    }
    if (ioctl(source_fd, EVIOCGRAB, 1) < 0) {
        fprintf(stderr, "fn-remap: cannot grab %s: %s\n", source_path, strerror(errno));
        close_device(&device);
        return false;
    }
    devices[(*count)++] = device;
    return true;
}

static void find_selected_devices(DeviceContext devices[MAX_DEVICES], size_t *count,
                                  const Config *config) {
    for (size_t selector_index = 0; selector_index < config->selector_count; selector_index++) {
        const DeviceSelector *selector = &config->selectors[selector_index];
        char name[128];
        struct input_id id;
        int fd = open_source(selector->path, name, sizeof(name), &id);
        if (fd >= 0 && matches_selector(&id, selector)) {
            (void)add_device(devices, count, fd, selector->path, name, config);
            continue;
        }
        if (fd >= 0) {
            close(fd);
        }
        for (int event_number = 0; event_number < EVENT_SCAN_LIMIT && *count < MAX_DEVICES;
             event_number++) {
            char path[64];
            snprintf(path, sizeof(path), "/dev/input/event%d", event_number);
            fd = open_source(path, name, sizeof(name), &id);
            if (fd < 0) {
                continue;
            }
            if (!matches_selector(&id, selector) || source_already_open(devices, *count, path)) {
                close(fd);
                continue;
            }
            (void)add_device(devices, count, fd, path, name, config);
            break;
        }
    }
}

static void find_default_device(DeviceContext devices[MAX_DEVICES], size_t *count,
                                const Config *config) {
    for (int event_number = 0; event_number < EVENT_SCAN_LIMIT && *count < MAX_DEVICES;
         event_number++) {
        char path[64];
        char name[128];
        struct input_id id;
        snprintf(path, sizeof(path), "/dev/input/event%d", event_number);
        int fd = open_source(path, name, sizeof(name), &id);
        if (fd < 0) {
            continue;
        }
        if (!is_auto_keyboard(fd, name)) {
            close(fd);
            continue;
        }
        (void)add_device(devices, count, fd, path, name, config);
    }
}

typedef struct {
    int fd;
} CaptureSource;

static int64_t monotonic_milliseconds(void) {
    struct timespec now;
    clock_gettime(CLOCK_MONOTONIC, &now);
    return (int64_t)now.tv_sec * 1000 + now.tv_nsec / 1000000;
}

static int capture_key_events(unsigned int seconds, bool collect_all) {
    Config config;
    load_config(&config);
    CaptureSource sources[MAX_DEVICES];
    size_t source_count = 0;
    for (int event_number = 0; event_number < EVENT_SCAN_LIMIT && source_count < MAX_DEVICES;
         event_number++) {
        char path[64];
        char name[128];
        struct input_id id;
        snprintf(path, sizeof(path), "/dev/input/event%d", event_number);
        int fd = open(path, O_RDONLY | O_NONBLOCK | O_CLOEXEC);
        if (fd < 0 || !read_device_info(fd, name, sizeof(name), &id) ||
            is_virtual_name(name) || !is_capture_keyboard(&config, fd, name, &id)) {
            if (fd >= 0) {
                close(fd);
            }
            continue;
        }
        sources[source_count++].fd = fd;
    }
    if (source_count == 0) {
        fprintf(stderr, "fn-remap: no input nodes available for capture\n");
        return 1;
    }

    bool captured[KEY_MAX + 1] = {0};
    fprintf(stderr, "fn-remap: capture listening for %u seconds%s\n", seconds,
            collect_all ? " (collecting combinations)" : "");
    const int64_t deadline = monotonic_milliseconds() + (int64_t)seconds * 1000;
    struct pollfd fds[MAX_DEVICES];
    while (keep_running) {
        int64_t remaining = deadline - monotonic_milliseconds();
        if (remaining <= 0) {
            break;
        }
        nfds_t count = 0;
        for (size_t index = 0; index < source_count; index++) {
            fds[count++] = (struct pollfd){.fd = sources[index].fd, .events = POLLIN};
        }
        int ready = poll(fds, count, remaining > INT_MAX ? INT_MAX : (int)remaining);
        if (ready < 0) {
            if (errno == EINTR) {
                continue;
            }
            break;
        }
        if (ready == 0) {
            break;
        }
        for (size_t index = 0; index < source_count; index++) {
            if ((fds[index].revents & POLLIN) == 0) {
                continue;
            }
            struct input_event events[32];
            ssize_t bytes = read(sources[index].fd, events, sizeof(events));
            if (bytes <= 0) {
                continue;
            }
            for (ssize_t event_index = 0;
                 event_index < bytes / (ssize_t)sizeof(struct input_event); event_index++) {
                const struct input_event *event = &events[event_index];
                if (event->type != EV_KEY || event->value != 1 ||
                    is_button_input_code(event->code)) {
                    continue;
                }
                if (event->code > KEY_MAX || captured[event->code]) {
                    continue;
                }
                captured[event->code] = true;
                const char *name = key_name_from_code(event->code);
                if (name != NULL) {
                    printf("%s\n", name);
                } else {
                    printf("CODE_%u\n", event->code);
                }
                fflush(stdout);
                if (!collect_all) {
                    goto capture_done;
                }
            }
        }
    }
capture_done:
    for (size_t index = 0; index < source_count; index++) {
        close(sources[index].fd);
    }
    return 0;
}

static int forward_devices(DeviceContext devices[MAX_DEVICES], size_t count, const Config *config) {
    struct pollfd fds[MAX_DEVICES * 2];
    while (keep_running) {
        nfds_t fd_count = 0;
        for (size_t index = 0; index < count; index++) {
            fds[fd_count++] = (struct pollfd){.fd = devices[index].source_fd, .events = POLLIN};
            fds[fd_count++] = (struct pollfd){.fd = devices[index].virtual_fd, .events = POLLIN};
        }
        int ready = poll(fds, fd_count, 1000);
        if (ready < 0) {
            if (errno == EINTR) {
                continue;
            }
            return -1;
        }
        for (size_t index = 0; index < count; index++) {
            struct pollfd *source = &fds[index * 2];
            struct pollfd *virtual = &fds[index * 2 + 1];
            if (source->revents & (POLLERR | POLLHUP | POLLNVAL) ||
                virtual->revents & (POLLERR | POLLHUP | POLLNVAL)) {
                return -1;
            }
            if ((virtual->revents & POLLIN) && handle_virtual_output(&devices[index]) < 0) {
                return -1;
            }
            if ((source->revents & POLLIN) && handle_source(&devices[index], config) < 0) {
                return -1;
            }
        }
    }
    return 0;
}

int main(int argc, char **argv) {
    signal(SIGINT, stop);
    signal(SIGTERM, stop);
    signal(SIGHUP, stop);
    signal(SIGCHLD, SIG_IGN);

    if (argc >= 2 && strcmp(argv[1], "--capture") == 0) {
        unsigned long seconds = 5;
        bool collect_all = false;
        if (argc >= 3) {
            char *end = NULL;
            seconds = strtoul(argv[2], &end, 10);
            if (end == argv[2] || *end != '\0' || seconds == 0 || seconds > 30) {
                fprintf(stderr, "usage: fn-remap --capture [seconds 1-30]\n");
                return 2;
            }
        }
        if (argc >= 4) {
            if (strcmp(argv[3], "--all") != 0 || argc != 4) {
                fprintf(stderr, "usage: fn-remap --capture [seconds 1-30] [--all]\n");
                return 2;
            }
            collect_all = true;
        }
        return capture_key_events((unsigned int)seconds, collect_all);
    }

    while (keep_running) {
        Config config;
        load_config(&config);
        DeviceContext devices[MAX_DEVICES];
        memset(devices, 0, sizeof(devices));
        for (size_t index = 0; index < MAX_DEVICES; index++) {
            devices[index].source_fd = -1;
            devices[index].virtual_fd = -1;
        }

        size_t count = 0;
        if (config.selector_count != 0) {
            find_selected_devices(devices, &count, &config);
        }
        if (count == 0 && config.auto_select) {
            find_default_device(devices, &count, &config);
        }
        if (count == 0) {
            fprintf(stderr, "fn-remap: no selected keyboard is available\n");
            sleep_seconds(RETRY_DELAY_SECONDS);
            continue;
        }

        fprintf(stderr, "fn-remap: active on %zu keyboard(s), %zu rule(s)\n", count,
                config.rule_count);
        (void)forward_devices(devices, count, &config);
        for (size_t index = 0; index < count; index++) {
            close_device(&devices[index]);
        }
        if (keep_running) {
            fprintf(stderr, "fn-remap: input device changed, retrying\n");
            sleep_seconds(RETRY_DELAY_SECONDS);
        }
    }
    return 0;
}
