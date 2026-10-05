// Safe C wrappers around private AppKit / DFRFoundation APIs that let a
// background app put an item in the Touch Bar Control Strip and present a
// full-width "system modal" Touch Bar. Every function is a no-op (returning
// NO where applicable) when the private API is missing, so the app degrades
// gracefully on Macs without a Touch Bar or on future macOS versions.
#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

/// YES when the private Touch Bar APIs LyricBar needs are present.
BOOL LBTouchBarAvailable(void);

/// Registers `item` as a Control Strip (system tray) item and makes it visible.
BOOL LBAddControlStripItem(NSTouchBarItem *item);

/// Removes an item previously added with LBAddControlStripItem.
void LBRemoveControlStripItem(NSTouchBarItem *item);

/// Presents `touchBar` full-width above every app's Touch Bar.
BOOL LBPresentSystemModal(NSTouchBar *touchBar, NSTouchBarItemIdentifier _Nullable trayIdentifier);

/// Collapses a presented system-modal Touch Bar back into its Control Strip item.
void LBMinimizeSystemModal(NSTouchBar *touchBar);

/// Removes a presented system-modal Touch Bar entirely.
void LBDismissSystemModal(NSTouchBar *touchBar);

/// Whether the system draws its own close (×) box on our system-modal bar.
void LBSetSystemModalShowsCloseBox(BOOL show);

NS_ASSUME_NONNULL_END
