import EventEmitter from "eventemitter3";
import { ApiPromise } from "@polkadot/api";

const createMockApiPromise = (): any => ({
  isConnected: jest.fn().mockReturnValue(true),
  query: {
    system: {
      events: jest.fn().mockImplementation((callback) => callback([])), // Simplified; adjust as needed
    },
  },
  isReadyOrError: Promise.resolve(),
  // Use the function itself to provide a new instance for the 'create' method
  create: jest.fn().mockImplementation(() => createMockApiPromise()),
  // Add more mocked methods and properties as needed
});

// A mock class for ApiHandler
class ApiHandlerMock extends EventEmitter {
  private _endpoints: string[];
  private _api: ApiPromise = createMockApiPromise as unknown as ApiPromise;
  private healthCheckInProgress = false;

  constructor(endpoints: string[]) {
    super();
    // Initialize with mock data or behavior as needed
    this._endpoints = endpoints.sort(() => Math.random() - 0.5);
  }

  async healthCheck(): Promise<boolean> {
    this.healthCheckInProgress = true;
    // Simulate the health check logic; adjust the logic as needed for your tests
    const isConnected = this._api.isConnected;
    this.healthCheckInProgress = false;
    return isConnected;
  }

  async getProvider(endpoints: string[]): Promise<ApiPromise | undefined> {
    // Simulate the provider selection logic; adjust as needed
    if (endpoints && endpoints.length > 0) {
      return createMockApiPromise as unknown as ApiPromise;
    }
    return undefined;
  }

  async getAPI(retries = 0): Promise<ApiPromise> {
    // Use the mockApiPromise directly for simplicity
    return this._api;
  }

  async setAPI(): Promise<void> {
    // Directly set the mock _api; in a real scenario, you might want to simulate more complex logic
    this._api = await this.getAPI();
  }

  isConnected(): boolean {
    return this._api.isConnected;
  }

  getApi(): ApiPromise {
    return this._api;
  }

  _registerEventHandlers(api: ApiPromise): void {
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
