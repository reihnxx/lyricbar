import Foundation
import Network

/// Local WebSocket server the browser extension connects to.
/// Binds to 127.0.0.1 only and refuses connections from web pages.
final class LyricServer {
    let port: UInt16
    var onMessage: ((Incoming) -> Void)?
    var onConnectionsChanged: ((Int) -> Void)?
    var onListenerError: ((String) -> Void)?

    private let queue = DispatchQueue(label: "lyricbar.server")
    private var listener: NWListener?
    private var connections: [ObjectIdentifier: NWConnection] = [:]

    init(port: UInt16) {
        self.port = port
    }

    func start() {
        let ws = NWProtocolWebSocket.Options()
        ws.autoReplyPing = true
        ws.maximumMessageSize = 4 * 1024 * 1024
        ws.setClientRequestHandler(queue) { _, headers in
            // Browsers always send Origin. Allow extensions and native clients
            // (no Origin); reject ordinary web pages.
            let origin = headers.first { $0.name.lowercased() == "origin" }?.value ?? ""
            let allowed = origin.isEmpty
                || origin.hasPrefix("chrome-extension://")
                || origin.hasPrefix("moz-extension://")
                || origin.hasPrefix("safari-web-extension://")
            return NWProtocolWebSocket.Response(status: allowed ? .accept : .reject, subprotocol: nil)
        }

        let params = NWParameters.tcp
        params.defaultProtocolStack.applicationProtocols.insert(ws, at: 0)
        params.allowLocalEndpointReuse = true
        params.requiredLocalEndpoint = .hostPort(host: .ipv4(.loopback), port: NWEndpoint.Port(rawValue: port)!)

        do {
            let listener = try NWListener(using: params)
            listener.newConnectionHandler = { [weak self] connection in self?.accept(connection) }
            listener.stateUpdateHandler = { [weak self] state in
                guard let self else { return }
                if case .failed(let error) = state {
                    self.report("Can't listen on 127.0.0.1:\(self.port) — \(error.localizedDescription)")
                    listener.cancel()
                    self.queue.asyncAfter(deadline: .now() + 3) { self.start() }
                }
            }
            self.listener = listener
            listener.start(queue: queue)
        } catch {
            report("Can't start server: \(error.localizedDescription)")
        }
    }

    private func report(_ message: String) {
        NSLog("[LyricBar] %@", message)
        DispatchQueue.main.async { self.onListenerError?(message) }
    }

    private func accept(_ connection: NWConnection) {
        let id = ObjectIdentifier(connection)
        connection.stateUpdateHandler = { [weak self, weak connection] state in
            guard let self, let connection else { return }
            switch state {
            case .ready:
                self.connections[id] = connection
                self.publishCount()
                self.receive(on: connection)
            case .failed, .cancelled:
                if self.connections.removeValue(forKey: id) != nil { self.publishCount() }
            default:
                break
            }
        }
        connection.start(queue: queue)
    }

    private func publishCount() {
        let count = connections.count
        DispatchQueue.main.async { self.onConnectionsChanged?(count) }
    }

    private func receive(on connection: NWConnection) {
        connection.receiveMessage { [weak self] data, context, _, error in
            guard let self else { return }
            if let data, !data.isEmpty,
               let meta = context?.protocolMetadata(definition: NWProtocolWebSocket.definition) as? NWProtocolWebSocket.Metadata,
               meta.opcode == .text {
                let message = Incoming.decode(data)
                if case .ping = message { self.send(#"{"type":"pong"}"#, on: connection) }
                DispatchQueue.main.async { self.onMessage?(message) }
            }
            if error == nil, connection.state == .ready {
                self.receive(on: connection)
            } else {
                connection.cancel()
            }
        }
    }

    /// Sends a command to every connected extension.
    func broadcast(_ command: Command) {
        let text = command.json
        queue.async {
            for connection in self.connections.values { self.send(text, on: connection) }
        }
    }

    private func send(_ text: String, on connection: NWConnection) {
        let meta = NWProtocolWebSocket.Metadata(opcode: .text)
        let context = NWConnection.ContentContext(identifier: "text", metadata: [meta])
        connection.send(content: Data(text.utf8), contentContext: context, isComplete: true, completion: .idempotent)
    }
}
