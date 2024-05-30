import EventEmitter from "eventemitter3";
import { ApiPromise } from "@polkadot/api";
import { vi } from "vitest";

const createMockApiPromise = (): any => ({
  isConnected: vi.fn().mockReturnValue(true),
  query: {
    system: {
      events: vi.fn().mockImplementation((callback) => callback([])), // Simplified; adjust as needed
    },
  },
  isReadyOrError: Promise.resolve(),
  // Use the function itself to provide a new instance for the 'create' method
  create: vi.fn().mockImplementation(() => createMockApiPromise()),
  // Add more mocked methods and properties as needed
});

// A mock class for ApiHandler
class ApiHandlerMock extends EventEmitter {
  private endpoints: string[];
  private api: ApiPromise = createMockApiPromise as unknown as ApiPromise;

  constructor(endpoints: string[]) {
    super();
    // Initialize with mock data or behavior as needed
    this.endpoints = endpoints.sort(() => Math.random() - 0.5);
    this.api = createMockApiPromise();
  }

  async getProvider(endpoints: string[]): Promise<ApiPromise | undefined> {
    // Simulate the provider selection logic; adjust as needed
    if (endpoints && endpoints.length > 0) {
      return createMockApiPromise as unknown as ApiPromise;
    }
    return undefined;
  }

  get isConnected(): boolean {
    return this.api.isConnected;
  }

  async getApi(): Promise<ApiPromise> {
    return this.api;
  }

  private registerEventHandlers(api: ApiPromise): void {
    // Simplify the event handler registration for testing purposes
    // In a real scenario, you might want to simulate more complex event handling
    api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;
        // Emit simplified mock events or log them; adjust as needed
        console.log(`Mock event: ${event.section} - ${event.method}`);
      });
    });
  }

  // Add any other methods or logic as needed for your tests
}

export default ApiHandlerMock;
