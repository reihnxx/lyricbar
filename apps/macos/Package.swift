// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "LyricBar",
    platforms: [.macOS(.v11)],
    targets: [
        // Thin, defensive wrapper around the private Touch Bar / Control Strip APIs.
        .target(name: "TouchBarPrivate", path: "Sources/TouchBarPrivate"),
        .executableTarget(
            name: "LyricBar",
            dependencies: ["TouchBarPrivate"],
            path: "Sources/LyricBar",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("Network"),
                .linkedFramework("ServiceManagement"),
            ]
        ),
    ]
)
