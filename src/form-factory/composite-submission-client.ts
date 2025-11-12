import type { SubmissionAdapter, SubmissionHandler, SubmitFormArgs } from './types';

interface CompositeSubmissionClientOptions {
  defaultAdapter?: SubmissionAdapter;
  handlers?: Record<string, SubmissionHandler>;
}

/**
 * Composite submission client that routes per-collection handlers and optionally falls back to a default adapter.
 */
 export class CompositeSubmissionClient implements SubmissionAdapter {
  private defaultAdapter?: SubmissionAdapter;
  private handlers: Map<string, SubmissionHandler>;

  constructor(options: CompositeSubmissionClientOptions) {
    this.defaultAdapter = options.defaultAdapter;
    this.handlers = new Map(Object.entries(options.handlers ?? {}));
  }

  registerHandler(collectionId: string, handler: SubmissionHandler): void {
    this.handlers.set(collectionId, handler);
  }

  async submit(args: SubmitFormArgs): Promise<unknown> {
    const handler = this.handlers.get(args.collection.id);
    if (handler) {
      return handler(args, this.defaultAdapter);
    }
    if (this.defaultAdapter) {
      return this.defaultAdapter.submit(args);
    }
    throw new Error(`No submission handler or default adapter configured for collection ${args.collection.id}`);
  }
}
