import Foundation

/// User preferences (UserDefaults, domain io.github.lyricbar).
/// Port can be changed with: defaults write io.github.lyricbar port -int 8975
enum Settings {
    private static let defaults = UserDefaults.standard

    static func register() {
        defaults.register(defaults: [
            "port": 8974,
            "autoShowTouchBar": true,
            "showNextLine": true,
            "menuBarLyrics": false,
            "hideWhenNoLyrics": false,
            "fontSize": 15.0,
        ])
    }

    static var port: UInt16 {
        UInt16(clamping: max(1, defaults.integer(forKey: "port")))
    }

    static var autoShowTouchBar: Bool {
        get { defaults.bool(forKey: "autoShowTouchBar") }
        set { defaults.set(newValue, forKey: "autoShowTouchBar") }
    }

    static var showNextLine: Bool {
        get { defaults.bool(forKey: "showNextLine") }
        set { defaults.set(newValue, forKey: "showNextLine") }
    }

    static var menuBarLyrics: Bool {
        get { defaults.bool(forKey: "menuBarLyrics") }
        set { defaults.set(newValue, forKey: "menuBarLyrics") }
    }

    /// Collapse the Touch Bar back to normal when a song has no lyrics.
    static var hideWhenNoLyrics: Bool {
        get { defaults.bool(forKey: "hideWhenNoLyrics") }
        set { defaults.set(newValue, forKey: "hideWhenNoLyrics") }
    }

    static var fontSize: CGFloat {
        CGFloat(min(20, max(10, defaults.double(forKey: "fontSize"))))
    }
}
