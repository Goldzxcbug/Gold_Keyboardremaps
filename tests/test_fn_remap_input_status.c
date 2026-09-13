// Host test for the occupancy snapshot the daemon publishes.
//
// The daemon's snapshot is the only thing Anland is allowed to believe about
// which nodes Gold holds, so the rules around it are worth testing directly:
// only grabbed nodes are claimable, the list is lexically ordered the way the
// reader expects, the file is replaced atomically, and a worker on its way out
// cannot overwrite the claim of the worker that replaced it.
//
// fn_remap.c is compiled into this translation unit so the static helpers can be
// driven with fabricated devices; nothing here touches a real input device.
// Built and run by tests/test_fn_remap_input_status.sh.

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

static DeviceContext make_device(const char *path, int source_fd) {
    DeviceContext device;
    memset(&device, 0, sizeof(device));
    device.source_fd = source_fd;
    device.virtual_fd = -1;
    snprintf(device.source_path, sizeof(device.source_path), "%s", path);
    return device;
}

static bool read_status(char *out, size_t out_size) {
    FILE *file = fopen(INPUT_STATUS_PATH, "r");
    if (file == NULL) {
        return false;
    }
    bool ok = fgets(out, (int)out_size, file) != NULL;
    fclose(file);
    return ok;
}

// Pulls "\t<key>=<value>" out of a canonical line.
static void extract(const char *line, const char *key, char *out, size_t out_size) {
    out[0] = '\0';
    char pattern[32];
    snprintf(pattern, sizeof(pattern), "\t%s=", key);
    const char *at = strstr(line, pattern);
    if (at == NULL) {
        return;
    }
    at += strlen(pattern);
    const char *end = strchr(at, '\t');
    size_t length = (end == NULL) ? strlen(at) : (size_t)(end - at);
    // The last field ends at the newline rather than at a tab.
    while (length > 0 && (at[length - 1] == '\n' || at[length - 1] == '\r')) {
        length--;
    }
    if (length >= out_size) {
        length = out_size - 1;
    }
    memcpy(out, at, length);
    out[length] = '\0';
}

static bool file_exists(const char *path) {
    return access(path, F_OK) == 0;
}

int main(void) {
    status_init_identity();

    char line[512];
    char value[256];
    char nodes[256];
    char count[16];
    char instance[64];

    // ---- only grabbed nodes are claimable ---------------------------------

    // Deliberately given out of order, and chosen so that lexical, numeric and
    // insertion order all differ: lexical is event10,event2,event9, numeric
    // would be event2,event9,event10, and insertion is event9,event2,event10.
    DeviceContext occupied[3];
    occupied[0] = make_device("/dev/input/event9", 7);
    occupied[1] = make_device("/dev/input/event2", 8);
    occupied[2] = make_device("/dev/input/event10", 9);
    status_publish(occupied, 3);
    check(read_status(line, sizeof(line)), "a snapshot is written");

    extract(line, "count", count, sizeof(count));
    extract(line, "nodes", nodes, sizeof(nodes));
    check(strcmp(count, "3") == 0, "count matches the number of grabbed nodes");
    check(strcmp(nodes, "event10,event2,event9") == 0, "nodes are in lexical order");

    // A device whose fd is closed is no longer held, even if it is still listed.
    // event1 is closed and would otherwise sort first, so a leak would show.
    DeviceContext half[2];
    half[0] = make_device("/dev/input/event1", -1);
    half[1] = make_device("/dev/input/event4", 9);
    status_publish(half, 2);
    read_status(line, sizeof(line));
    extract(line, "nodes", nodes, sizeof(nodes));
    check(strcmp(nodes, "event4") == 0, "a closed device is not claimed");

    // ---- verified empty ---------------------------------------------------

    status_publish(occupied, 0);
    read_status(line, sizeof(line));
    extract(line, "nodes", nodes, sizeof(nodes));
    extract(line, "count", count, sizeof(count));
    check(strcmp(count, "0") == 0 && strcmp(nodes, "-") == 0,
          "an empty set is spelled count=0 nodes=-");

    // ---- shape of the line ------------------------------------------------

    status_publish(occupied, 2);
    read_status(line, sizeof(line));
    extract(line, "boot_id", value, sizeof(value));
    check(value[0] != '\0', "the line carries a boot id");
    extract(line, "instance", instance, sizeof(instance));
    check(strlen(instance) == 32, "the instance token is 32 characters");
    bool hex = true;
    for (size_t index = 0; index < strlen(instance); index++) {
        char c = instance[index];
        if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))) {
            hex = false;
        }
    }
    check(hex, "the instance token is lowercase hex");

    bool prefixed = strncmp(line, "GOLDCTL1\tinput-status\tok\tcode=ready\t", 34) == 0;
    check(prefixed, "the line starts with the canonical prefix");
    check(line[strlen(line) - 1] == '\n', "the line is newline terminated");

    // ---- generation advances ---------------------------------------------

    char first[16];
    char second[16];
    extract(line, "generation", first, sizeof(first));
    status_publish(occupied, 2);
    read_status(line, sizeof(line));
    extract(line, "generation", second, sizeof(second));
    check(strtoull(second, NULL, 10) > strtoull(first, NULL, 10),
          "each publication advances the generation");

    // ---- atomic replacement ----------------------------------------------

    check(!file_exists(INPUT_STATUS_TMP), "no temporary file is left behind");

    // ---- a departing worker must not clobber its successor ----------------

    // Pretend a newer worker already owns the file.
    FILE *file = fopen(INPUT_STATUS_PATH, "w");
    check(file != NULL, "the test can write to the snapshot path");
    if (file != NULL) {
        fprintf(file,
                "GOLDCTL1\tinput-status\tok\tcode=ready\tboot_id=other"
                "\tgeneration=99\tinstance=ffffffffffffffffffffffffffffffff"
                "\tcount=1\tnodes=event9\n");
        fclose(file);
    }
    status_release(NULL, 0);
    read_status(line, sizeof(line));
    extract(line, "instance", instance, sizeof(instance));
    check(strcmp(instance, "ffffffffffffffffffffffffffffffff") == 0,
          "a shutdown publish leaves another worker's claim alone");

    // Our own file, though, is ours to correct.
    status_publish(occupied, 2);
    status_release(NULL, 0);
    read_status(line, sizeof(line));
    extract(line, "count", count, sizeof(count));
    check(strcmp(count, "0") == 0, "a shutdown publish clears our own claim");

    // ---- the heartbeat is driven by time, not by events --------------------

    // A busy keyboard keeps poll() returning forever, and the retry backoff can
    // sleep for half a minute. A refresh keyed off either one would leave a
    // healthy daemon looking dead exactly when it is working hardest.
    char generation_a[16];
    char generation_b[16];

    status_publish(occupied, 3);
    check(!status_heartbeat_due(), "a fresh publish is not immediately due again");

    read_status(line, sizeof(line));
    extract(line, "generation", generation_a, sizeof(generation_a));
    status_heartbeat(occupied, 3);
    read_status(line, sizeof(line));
    extract(line, "generation", generation_b, sizeof(generation_b));
    check(strcmp(generation_a, generation_b) == 0,
          "a heartbeat inside the interval writes nothing");

    g_status_last_publish.tv_sec -= (INPUT_STATUS_HEARTBEAT_SECONDS + 1);
    check(status_heartbeat_due(), "a publish older than the interval is due");
    status_heartbeat(occupied, 3);
    read_status(line, sizeof(line));
    extract(line, "generation", generation_b, sizeof(generation_b));
    check(strtoull(generation_b, NULL, 10) > strtoull(generation_a, NULL, 10),
          "a due heartbeat refreshes the snapshot");

    // Waiting is the other place the heartbeat used to stop entirely.
    g_status_last_publish.tv_sec -= (INPUT_STATUS_HEARTBEAT_SECONDS + 1);
    generation_a[0] = '\0';
    strcpy(generation_a, generation_b);
    status_sleep(1, occupied, 3);
    read_status(line, sizeof(line));
    extract(line, "generation", generation_b, sizeof(generation_b));
    check(strtoull(generation_b, NULL, 10) > strtoull(generation_a, NULL, 10),
          "waiting for a retry keeps the heartbeat alive");

    // ---- the claimed set ---------------------------------------------------

    // Nothing found yet: the field is still present and spelled as a dash, so a
    // reader never has to guess whether the publisher is too old to have it.
    status_publish(occupied, 3);
    read_status(line, sizeof(line));
    extract(line, "claimed", value, sizeof(value));
    check(strcmp(value, "-") == 0, "an empty claimed set is spelled as a dash");

    // The whole point: a keyboard this daemon is responsible for is claimed
    // whether or not it is the one currently held.
    snprintf(g_claimed[0], sizeof(g_claimed[0]), "event12");
    snprintf(g_claimed[1], sizeof(g_claimed[0]), "event9");
    g_claimed_count = 2;
    status_publish(occupied, 1);
    read_status(line, sizeof(line));
    extract(line, "claimed", value, sizeof(value));
    check(strcmp(value, "event12,event9") == 0,
          "the claimed set is listed in lexical order");
    extract(line, "count", count, sizeof(count));
    check(strcmp(count, "1") == 0, "claimed is independent of what is held");
    g_claimed_count = 0;

    printf("\n%s\n", failures == 0 ? "all checks passed" : "there were failures");
    return failures == 0 ? 0 : 1;
}
