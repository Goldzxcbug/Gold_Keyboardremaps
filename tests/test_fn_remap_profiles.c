// Host test for mapping profiles.
//
// Profiles decide what the user's keys do, and a mistake here is invisible
// until someone presses the key in the wrong moment. The rules worth pinning:
// a config written before profiles existed keeps working untouched, only the
// profile in force contributes rules, Anland's request file outranks the
// config's own choice, and switching lets go of everything the outgoing profile
// was holding -- a key pressed under one profile must not be stranded by the
// next one having no rule that would ever release it.
//
// Built and run by tests/test_fn_remap_profiles.sh.

#define main gold_daemon_main
#include "../fn_remap.c"
#undef main

static int failures;

static void check(bool ok, const char *what) {
    if (ok) {
        printf("ok   %s\n", what);
    } else {
        printf("FAIL %s\n", what);
        failures++;
    }
}

static void write_text(const char *path, const char *text) {
    FILE *file = fopen(path, "w");
    if (file == NULL) {
        printf("FAIL cannot write %s\n", path);
        failures++;
        return;
    }
    fputs(text, file);
    fclose(file);
}

/** Whether the loaded rule set contains exactly this source->target mapping. */
static bool has_rule(const Config *config, int source, int target) {
    for (size_t index = 0; index < config->rule_count; index++) {
        const MappingRule *rule = &config->rules[index];
        if (rule->action != RULE_ACTION_KEYS || rule->source_count != 1 ||
            rule->target_count != 1) {
            continue;
        }
        if (rule->source[0] == source && rule->target[0] == target) {
            return true;
        }
    }
    return false;
}

int main(void) {
    const char *config_path = getenv("GOLD_TEST_CONFIG");
    const char *request_path = getenv("GOLD_TEST_REQUEST");
    if (config_path == NULL || request_path == NULL) {
        printf("FAIL GOLD_TEST_CONFIG and GOLD_TEST_REQUEST must be set\n");
        return 2;
    }

    Config config;
    char profile[PROFILE_NAME_MAX];

    // ---- a config from before profiles existed -----------------------------

    write_text(config_path,
               "version=1\n"
               "device=auto\n"
               "mapping=KEY_A=>KEY_B\n");
    resolve_active_profile(profile, sizeof(profile));
    check(strcmp(profile, DEFAULT_PROFILE_NAME) == 0,
          "a config with no profiles resolves to the default one");
    load_config_profile(&config, profile);
    check(has_rule(&config, KEY_A, KEY_B),
          "rules outside any profile still load");

    // ---- sections are isolated ---------------------------------------------

    write_text(config_path,
               "version=1\n"
               "device=auto\n"
               "profile=方案一\n"
               "mapping=KEY_A=>KEY_B\n"
               "profile=方案二\n"
               "mapping=KEY_C=>KEY_D\n"
               "profile=Anland\n"
               "mapping=KEY_E=>KEY_F\n"
               "active_profile=方案二\n");

    resolve_active_profile(profile, sizeof(profile));
    check(strcmp(profile, "方案二") == 0, "the config nominates the active profile");

    load_config_profile(&config, "方案一");
    check(has_rule(&config, KEY_A, KEY_B) && !has_rule(&config, KEY_C, KEY_D),
          "方案一 loads its own rules and nobody else's");

    load_config_profile(&config, "方案二");
    check(has_rule(&config, KEY_C, KEY_D) && !has_rule(&config, KEY_A, KEY_B),
          "方案二 loads its own rules and nobody else's");

    load_config_profile(&config, "Anland");
    check(has_rule(&config, KEY_E, KEY_F) && !has_rule(&config, KEY_A, KEY_B),
          "the Anland profile loads its own rules and nobody else's");

    // ---- the key bits have to cover every profile --------------------------
    // A switch keeps the same virtual device, and the input core drops EV_KEY
    // events for codes the device never declared. Declaring only the active
    // profile's targets would leave the next profile's mappings silently doing
    // nothing until Gold restarted, so the declaration asks for every section.

    load_config_profile(&config, "方案一");
    check(is_mapping_target(&config, KEY_B) && !is_mapping_target(&config, KEY_D),
          "a named profile contributes only its own targets");

    load_config_profile(&config, NULL);
    check(has_rule(&config, KEY_A, KEY_B) && has_rule(&config, KEY_C, KEY_D)
              && has_rule(&config, KEY_E, KEY_F),
          "a NULL profile collects every section");
    check(is_mapping_target(&config, KEY_B) && is_mapping_target(&config, KEY_D)
              && is_mapping_target(&config, KEY_F),
          "so the key bits cover every profile's targets, not just the active one's");

    // An empty profile is a real thing to ask for: it means "remap nothing".
    load_config_profile(&config, "不存在的方案");
    check(config.rule_count == 0,
          "a profile that is not in the file contributes no rules");

    // ---- device selection is not part of a profile -------------------------

    load_config_profile(&config, "方案一");
    check(config.auto_select, "device=auto applies inside a profile");

    write_text(config_path,
               "version=1\n"
               "device=auto\n"
               "profile=方案一\n"
               "mapping=KEY_A=>KEY_B\n"
               "profile=方案二\n"
               "device=/dev/input/event9|0019|22d9|3869\n"
               "mapping=KEY_C=>KEY_D\n");

    load_config_profile(&config, "方案一");
    check(config.selector_count == 1,
          "a device selector written under one profile still applies");

    // ---- Anland's request file outranks the config -------------------------

    write_text(config_path,
               "version=1\n"
               "device=auto\n"
               "profile=方案一\n"
               "profile=Anland\n"
               "mapping=KEY_E=>KEY_F\n"
               "active_profile=方案一\n");

    unlink(request_path);
    resolve_active_profile(profile, sizeof(profile));
    check(strcmp(profile, "方案一") == 0, "without the request file the config wins");

    write_text(request_path, "");
    resolve_active_profile(profile, sizeof(profile));
    check(strcmp(profile, ANLAND_PROFILE_NAME) == 0,
          "the request file puts the Anland profile in force");

    // A request for a profile the config does not define must not be honoured:
    // it would empty the rule set and stop every mapping the user has.
    write_text(config_path,
               "version=1\n"
               "device=auto\n"
               "profile=方案一\n"
               "mapping=KEY_A=>KEY_B\n"
               "active_profile=方案一\n");
    resolve_active_profile(profile, sizeof(profile));
    check(strcmp(profile, "方案一") == 0,
          "a request for a profile that is not defined is ignored");

    write_text(config_path,
               "version=1\n"
               "device=auto\n"
               "profile=方案一\n"
               "profile=Anland\n"
               "mapping=KEY_E=>KEY_F\n"
               "active_profile=方案一\n");

    // Removing it is what puts things back, so the daemon must see that too.
    unlink(request_path);
    resolve_active_profile(profile, sizeof(profile));
    check(strcmp(profile, "方案一") == 0, "removing the request file hands control back");

    // ---- a pending switch is noticed, and applied in place -----------------

    write_text(config_path,
               "version=1\n"
               "device=auto\n"
               "profile=方案一\n"
               "mapping=KEY_A=>KEY_B\n"
               "profile=Anland\n"
               "mapping=KEY_E=>KEY_F\n"
               "active_profile=方案一\n");
    unlink(request_path);

    load_config(&config);
    check(strcmp(g_active_profile, "方案一") == 0, "load_config records what it loaded");
    check(!profile_switch_pending(), "nothing is pending right after a load");

    write_text(request_path, "");
    check(profile_switch_pending(), "the request file makes a switch pending");

    resolve_active_profile(profile, sizeof(profile));
    load_config_profile(&config, profile);
    snprintf(g_active_profile, sizeof(g_active_profile), "%s", profile);
    check(has_rule(&config, KEY_E, KEY_F) && !has_rule(&config, KEY_A, KEY_B),
          "the pending profile replaces the rule set");
    check(!profile_switch_pending(), "and the switch is no longer pending");

    // ---- switching lets go of what the old profile held --------------------

    DeviceContext device;
    memset(&device, 0, sizeof(device));
    device.source_fd = -1;
    device.virtual_fd = open("/dev/null", O_WRONLY);
    check(device.virtual_fd >= 0, "the test can give the device somewhere to write");

    device.target_refs[KEY_LEFTCTRL] = 2;
    device.pressed[KEY_A] = true;
    device.forwarded[KEY_A] = true;
    device.pending[KEY_B] = true;
    device.suppressed[KEY_C] = true;
    device.active_rules[0] = true;

    release_all_keys(&device);

    check(device.target_refs[KEY_LEFTCTRL] == 0,
          "a target the outgoing profile held is released");
    check(!device.pressed[KEY_A] && !device.forwarded[KEY_A] && !device.pending[KEY_B] &&
          !device.suppressed[KEY_C],
          "no source key is left half-way through the outgoing profile");
    check(!device.active_rules[0], "no rule is left engaged");

    close(device.virtual_fd);

    // ---- a transformed key goes out and comes back as the same key ---------
    // A key re-labelled to Fn used to be published under its raw code while its
    // release was dropped -- it is not a rule source, so no rule lifted it and
    // its own release never reached the desktop. It stayed held for good. The
    // config here has the transform and no Fn chord, which is exactly the shape
    // that reaches this path.

    int pipe_fds[2];
    if (pipe(pipe_fds) != 0) {
        printf("FAIL cannot open a pipe to watch what is emitted\n");
        failures++;
    } else {
        DeviceContext transformed;
        memset(&transformed, 0, sizeof(transformed));
        transformed.source_fd = -1;
        transformed.virtual_fd = pipe_fds[1];

        Config fn_config;
        memset(&fn_config, 0, sizeof(fn_config));
        fn_config.auto_select = true;
        fn_config.fn_transform_sources[0] = KEY_F23;
        fn_config.fn_transform_count = 1;
        index_config_keys(&fn_config);

        struct input_event key_event;
        memset(&key_event, 0, sizeof(key_event));
        key_event.type = EV_KEY;
        key_event.code = KEY_F23;

        key_event.value = 1;
        (void)handle_key_event(&transformed, &fn_config, &key_event);
        (void)flush_forwarded_events(&transformed);
        key_event.value = 0;
        (void)handle_key_event(&transformed, &fn_config, &key_event);
        (void)flush_forwarded_events(&transformed);

        struct input_event emitted[OUTPUT_BATCH_EVENTS * 4];
        ssize_t bytes = read(pipe_fds[0], emitted, sizeof(emitted));
        size_t emitted_count =
            bytes > 0 ? (size_t)bytes / sizeof(struct input_event) : 0;

        bool saw_fn_down = false;
        bool saw_fn_up = false;
        bool saw_raw_code = false;
        for (size_t index = 0; index < emitted_count; index++) {
            if (emitted[index].type != EV_KEY) {
                continue;
            }
            if (emitted[index].code == KEY_FN) {
                if (emitted[index].value == 1) {
                    saw_fn_down = true;
                } else if (emitted[index].value == 0) {
                    saw_fn_up = true;
                }
            }
            if (emitted[index].code == KEY_F23) {
                saw_raw_code = true;
            }
        }
        check(saw_fn_down && saw_fn_up,
              "a transformed key is pressed and released as the key it became");
        check(!saw_raw_code,
              "and never under its raw code, which nothing would release");

        close(pipe_fds[0]);
        close(pipe_fds[1]);
    }

    printf("\n%s\n", failures == 0 ? "all checks passed" : "there were failures");
    return failures == 0 ? 0 : 1;
}
