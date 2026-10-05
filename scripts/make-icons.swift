// Renders the LyricBar icon (green rounded square + white note + lyric bars)
// into extension PNGs and a macOS .icns. Run: swift scripts/make-icons.swift
import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)

func render(_ px: Int) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let s = CGFloat(px)
    let inset = s * 0.06
    let rect = NSRect(x: inset, y: inset, width: s - inset * 2, height: s - inset * 2)
    let bg = NSBezierPath(roundedRect: rect, xRadius: s * 0.22, yRadius: s * 0.22)
    NSGradient(starting: NSColor(calibratedRed: 0.13, green: 0.82, blue: 0.40, alpha: 1),
               ending: NSColor(calibratedRed: 0.07, green: 0.55, blue: 0.26, alpha: 1))!.draw(in: bg, angle: -90)

    NSColor.white.setFill()
    // Note head + stem + flag.
    NSBezierPath(ovalIn: NSRect(x: s * 0.22, y: s * 0.40, width: s * 0.22, height: s * 0.17)).fill()
    NSBezierPath(rect: NSRect(x: s * 0.385, y: s * 0.48, width: s * 0.055, height: s * 0.30)).fill()
    NSBezierPath(roundedRect: NSRect(x: s * 0.385, y: s * 0.70, width: s * 0.17, height: s * 0.08), xRadius: s * 0.03, yRadius: s * 0.03).fill()
    // "Lyric" bars underneath, like a Touch Bar strip.
    NSColor(white: 1, alpha: 0.95).setFill()
    NSBezierPath(roundedRect: NSRect(x: s * 0.20, y: s * 0.24, width: s * 0.60, height: s * 0.07), xRadius: s * 0.035, yRadius: s * 0.035).fill()
    NSColor(white: 1, alpha: 0.55).setFill()
    NSBezierPath(roundedRect: NSRect(x: s * 0.56, y: s * 0.44, width: s * 0.24, height: s * 0.06), xRadius: s * 0.03, yRadius: s * 0.03).fill()
    NSBezierPath(roundedRect: NSRect(x: s * 0.56, y: s * 0.56, width: s * 0.17, height: s * 0.06), xRadius: s * 0.03, yRadius: s * 0.03).fill()
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

for px in [16, 32, 48, 128] {
    try! render(px).write(to: root.appendingPathComponent("extension/icons/icon\(px).png"))
}

let iconset = root.appendingPathComponent("apps/macos/Resources/AppIcon.iconset")
try? FileManager.default.removeItem(at: iconset)
try! FileManager.default.createDirectory(at: iconset, withIntermediateDirectories: true)
for base in [16, 32, 128, 256, 512] {
    try! render(base).write(to: iconset.appendingPathComponent("icon_\(base)x\(base).png"))
    try! render(base * 2).write(to: iconset.appendingPathComponent("icon_\(base)x\(base)@2x.png"))
}
print("icons written")
