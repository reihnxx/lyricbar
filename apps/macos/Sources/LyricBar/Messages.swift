import Foundation

// LyricBar protocol v1 — see docs/PROTOCOL.md.

struct LyricLine: Decodable, Equatable {
    let t: Double
    let text: String
}

struct MatchInfo: Decodable, Equatable {
    let index: Int
    let count: Int
    let label: String?
}

struct TrackInfo: Decodable, Equatable {
    let id: String?
    let title: String
    let artist: String
    let album: String?
    let durationMs: Double
    let loading: Bool?
    let source: String?
    let synced: Bool?
    let instrumental: Bool?
    let lines: [LyricLine]?
    /// Per-song timing nudge in ms (+ = lyrics earlier).
    let offsetMs: Double?
    /// Which lyrics candidate is shown, out of how many.
    let match: MatchInfo?
    /// User hid lyrics for this song.
    let hidden: Bool?
    /// "network" while the lookup failed and is being retried.
    let error: String?

    /// Identity of the song (lyrics updates for the same song keep the same key).
    var key: String { "\(title)\u{1F}\(artist)\u{1F}\(Int(durationMs / 1000))" }
    var hasLyrics: Bool { !(lines ?? []).isEmpty }
}

struct PlaybackState: Decodable, Equatable {
    let isPlaying: Bool
    let positionMs: Double
    let ts: Double
}

struct LinePayload: Decodable, Equatable {
    let index: Int
    let text: String?
    let next: String?
    let startMs: Double
    let endMs: Double?
}

enum Incoming {
    case hello(client: String?, version: String?)
    case track(TrackInfo)
    case state(PlaybackState)
    case line(LinePayload)
    case clear
    case ping
    case unknown

    private struct Envelope: Decodable {
        let type: String
        let client: String?
        let version: String?
    }

    static func decode(_ data: Data) -> Incoming {
        let decoder = JSONDecoder()
        guard let envelope = try? decoder.decode(Envelope.self, from: data) else { return .unknown }
        switch envelope.type {
        case "hello": return .hello(client: envelope.client, version: envelope.version)
        case "track": return (try? decoder.decode(TrackInfo.self, from: data)).map(Incoming.track) ?? .unknown
        case "state": return (try? decoder.decode(PlaybackState.self, from: data)).map(Incoming.state) ?? .unknown
        case "line": return (try? decoder.decode(LinePayload.self, from: data)).map(Incoming.line) ?? .unknown
        case "clear": return .clear
        case "ping": return .ping
        default: return .unknown
        }
    }
}

/// Commands a frontend can send back to the extension (protocol v1).
enum Command {
    case offset(deltaMs: Int)
    case offsetReset
    case nextMatch
    case toggleHidden
    case retry

    var json: String {
        switch self {
        case .offset(let delta): return #"{"type":"command","action":"offset","deltaMs":\#(delta)}"#
        case .offsetReset: return #"{"type":"command","action":"offset-reset"}"#
        case .nextMatch: return #"{"type":"command","action":"next-match"}"#
        case .toggleHidden: return #"{"type":"command","action":"toggle-hidden"}"#
        case .retry: return #"{"type":"command","action":"retry"}"#
        }
    }
}
