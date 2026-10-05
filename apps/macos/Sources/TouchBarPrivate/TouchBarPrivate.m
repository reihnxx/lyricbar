#import "TouchBarPrivate.h"
#import <dlfcn.h>
#import <objc/message.h>

// Private class methods implemented by AppKit (macOS 10.14+).
@interface NSTouchBarItem (LyricBarPrivate)
+ (void)addSystemTrayItem:(NSTouchBarItem *)item;
+ (void)removeSystemTrayItem:(NSTouchBarItem *)item;
@end

@interface NSTouchBar (LyricBarPrivate)
+ (void)presentSystemModalTouchBar:(NSTouchBar *)touchBar systemTrayItemIdentifier:(nullable NSTouchBarItemIdentifier)identifier;
+ (void)minimizeSystemModalTouchBar:(NSTouchBar *)touchBar;
+ (void)dismissSystemModalTouchBar:(NSTouchBar *)touchBar;
@end

static void *LBDFRFoundation(void) {
    static void *handle;
    static dispatch_once_t once;
    dispatch_once(&once, ^{
        handle = dlopen("/System/Library/PrivateFrameworks/DFRFoundation.framework/DFRFoundation", RTLD_LAZY);
    });
    return handle;
}

static void *LBDFRSymbol(const char *name) {
    void *handle = LBDFRFoundation();
    return handle ? dlsym(handle, name) : NULL;
}

BOOL LBTouchBarAvailable(void) {
    return LBDFRSymbol("DFRElementSetControlStripPresenceForIdentifier") != NULL
        && [NSTouchBarItem respondsToSelector:@selector(addSystemTrayItem:)]
        && [NSTouchBar respondsToSelector:@selector(presentSystemModalTouchBar:systemTrayItemIdentifier:)];
}

static void LBSetControlStripPresence(NSTouchBarItemIdentifier identifier, BOOL present) {
    void (*fn)(NSString *, BOOL) = LBDFRSymbol("DFRElementSetControlStripPresenceForIdentifier");
    if (fn) fn(identifier, present);
}

BOOL LBAddControlStripItem(NSTouchBarItem *item) {
    if (![NSTouchBarItem respondsToSelector:@selector(addSystemTrayItem:)]) return NO;
    [NSTouchBarItem addSystemTrayItem:item];
    LBSetControlStripPresence(item.identifier, YES);
    return YES;
}

void LBRemoveControlStripItem(NSTouchBarItem *item) {
    LBSetControlStripPresence(item.identifier, NO);
    if ([NSTouchBarItem respondsToSelector:@selector(removeSystemTrayItem:)]) {
        [NSTouchBarItem removeSystemTrayItem:item];
    }
}

BOOL LBPresentSystemModal(NSTouchBar *touchBar, NSTouchBarItemIdentifier _Nullable trayIdentifier) {
    if (![NSTouchBar respondsToSelector:@selector(presentSystemModalTouchBar:systemTrayItemIdentifier:)]) return NO;
    [NSTouchBar presentSystemModalTouchBar:touchBar systemTrayItemIdentifier:trayIdentifier];
    return YES;
}

void LBMinimizeSystemModal(NSTouchBar *touchBar) {
    if ([NSTouchBar respondsToSelector:@selector(minimizeSystemModalTouchBar:)]) {
        [NSTouchBar minimizeSystemModalTouchBar:touchBar];
    }
}

void LBDismissSystemModal(NSTouchBar *touchBar) {
    if ([NSTouchBar respondsToSelector:@selector(dismissSystemModalTouchBar:)]) {
        [NSTouchBar dismissSystemModalTouchBar:touchBar];
    }
}

void LBSetSystemModalShowsCloseBox(BOOL show) {
    void (*fn)(BOOL) = LBDFRSymbol("DFRSystemModalShowsCloseBoxWhenFrontMost");
    if (fn) fn(show);
}
