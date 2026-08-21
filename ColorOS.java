package gold.keyboardremaps;

import android.app.ActivityOptions;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

/** Single app_process entry point for ColorOS window and screenshot services. */
public final class ColorOS {
    private static final String WINDOW_MANAGER_CLASS = "com.oplus.zoomwindow.OplusZoomWindowManager";
    private static final String SCREENSHOT_MANAGER_CLASS = "com.oplus.screenshot.OplusScreenshotManager";
    private static final String SMART_SIDEBAR_PACKAGE = "com.coloros.smartsidebar";
    private static final String SOURCE_KEY = "screenshot_source";
    private static final String NORMAL_SOURCE = "systemQuickTileScreenshotIn";
    private static final String LONG_SOURCE = "systemQuickTileLongshot";
    private static final String AREA_SOURCE = "systemQuickTileArea";
    private static final int COLOROS_ZOOM_WINDOW_MODE = 100;

    private ColorOS() {
    }

    public static void main(String[] args) {
        if (args.length == 1 && isScreenshotArgument(args[0])) {
            launchScreenshot(args[0]);
            return;
        }
        launchWindow(args);
    }

    private static boolean isScreenshotArgument(String argument) {
        return "normal".equals(argument) || "long".equals(argument)
                || "area".equals(argument) || "--check".equals(argument);
    }

    private static void launchWindow(String[] args) {
        if (args.length < 1 || args.length > 2) {
            System.err.println("ColorOS small window: missing activity component");
            System.exit(2);
        }
        ComponentName component = ComponentName.unflattenFromString(args[0]);
        if (component == null) {
            System.err.println("ColorOS small window: invalid activity component");
            System.exit(2);
        }
        Intent intent = new Intent(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_LAUNCHER)
                .setComponent(component)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        Bundle options = ActivityOptions.makeBasic().setLaunchDisplayId(0).toBundle();
        options.putInt("extra_window_mode", COLOROS_ZOOM_WINDOW_MODE);
        options.putInt("android.activity.splashScreenStyle", 1);
        try {
            Class<?> managerClass = Class.forName(WINDOW_MANAGER_CLASS);
            Object manager = managerClass.getMethod("getInstance").invoke(null);
            if (args.length == 2 && "toggle".equals(args[1])
                    && hideMatchingWindow(manager, managerClass, component)) {
                return;
            }
            Method startZoomWindow = managerClass.getMethod(
                    "startZoomWindow", Intent.class, Bundle.class, int.class, String.class);
            int result = (Integer) startZoomWindow.invoke(
                    manager, intent, options, 0, SMART_SIDEBAR_PACKAGE);
            if (result < 0) {
                System.err.println("ColorOS small window rejected the request: " + result);
                System.exit(1);
            }
            System.out.println("ColorOS small window started: " + component.flattenToShortString());
        } catch (ReflectiveOperationException | SecurityException error) {
            System.err.println("ColorOS small window unavailable: " + error);
            System.exit(1);
        }
    }

    private static boolean hideMatchingWindow(Object manager, Class<?> managerClass,
                                               ComponentName component)
            throws ReflectiveOperationException {
        Object info = managerClass.getMethod("getCurrentZoomWindowState").invoke(manager);
        if (info == null) return false;
        Class<?> infoClass = info.getClass();
        String zoomPackage = (String) infoClass.getField("zoomPkg").get(info);
        boolean shown = infoClass.getField("windowShown").getBoolean(info);
        int windowType = infoClass.getField("windowType").getInt(info);
        if (!component.getPackageName().equals(zoomPackage) || !shown || windowType != 1) {
            return false;
        }
        managerClass.getMethod("hideZoomWindow", int.class).invoke(manager, 2);
        System.out.println("ColorOS small window hidden: " + component.getPackageName());
        return true;
    }

    private static void launchScreenshot(String mode) {
        if ("--check".equals(mode)) {
            checkScreenshotApi();
            return;
        }
        String source;
        switch (mode) {
            case "normal": source = NORMAL_SOURCE; break;
            case "long": source = LONG_SOURCE; break;
            case "area": source = AREA_SOURCE; break;
            default:
                System.err.println("ColorOS screenshot: unknown mode " + mode);
                System.exit(2);
                return;
        }
        try {
            Class<?> managerClass = Class.forName(SCREENSHOT_MANAGER_CLASS);
            Object manager = managerClass.getMethod("getInstance").invoke(null);
            Method takeScreenshot = managerClass.getMethod("takeScreenshot", Bundle.class);
            Bundle request = new Bundle();
            request.putString(SOURCE_KEY, source);
            takeScreenshot.invoke(manager, request);
            System.out.println("ColorOS screenshot requested: " + mode);
        } catch (InvocationTargetException error) {
            Throwable cause = error.getCause() == null ? error : error.getCause();
            System.err.println("ColorOS screenshot rejected: " + cause);
            System.exit(1);
        } catch (ReflectiveOperationException | SecurityException error) {
            System.err.println("ColorOS screenshot unavailable: " + error);
            System.exit(1);
        }
    }

    private static void checkScreenshotApi() {
        try {
            Class<?> managerClass = Class.forName(SCREENSHOT_MANAGER_CLASS);
            managerClass.getMethod("getInstance");
            managerClass.getMethod("takeScreenshot", Bundle.class);
            System.out.println("ColorOS screenshot API available");
        } catch (ReflectiveOperationException | SecurityException error) {
            System.err.println("ColorOS screenshot API unavailable: " + error);
            System.exit(1);
        }
    }
}
