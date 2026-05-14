declare module "ws" {
  import type { IncomingMessage, Server } from "http"

  export type RawData = Buffer | ArrayBuffer | Buffer[]

  export class WebSocket {
    static OPEN: number
    readyState: number
    close(code?: number, reason?: string): void
    send(data: string | Buffer | ArrayBuffer): void
    on(event: "message", listener: (data: RawData) => void): this
    on(event: "close", listener: () => void): this
    on(event: "error", listener: (error: Error) => void): this
  }

  export class WebSocketServer {
    constructor(options: { server: Server; path?: string })
    on(event: "connection", listener: (socket: WebSocket, request: IncomingMessage) => void): this
  }
}
