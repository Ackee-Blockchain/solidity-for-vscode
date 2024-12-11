import {
    ErrorHandler,
    BaseLanguageClient,
    Message,
    ErrorHandlerResult,
    ErrorAction,
    CloseHandlerResult,
    CloseAction
} from 'vscode-languageclient/node';
import { Analytics, EventType } from './Analytics';
import { OutputChannel } from 'vscode';

export class ClientErrorHandler implements ErrorHandler {
    private client: BaseLanguageClient | undefined;
    private readonly restarts: number[];
    private maxRestartCount: number = 5;

    constructor(
        private outputChannel: OutputChannel,
        private analytics: Analytics
    ) {
        this.restarts = [];
    }

    public error(_error: Error, _message: Message, count: number): ErrorHandlerResult {
        if (count && count <= 3) {
            this.analytics.logEvent(EventType.ERROR_WAKE_CONNECTION_ERROR_CONTINUE);
            return { action: ErrorAction.Continue };
        }
        this.analytics.logEvent(EventType.ERROR_WAKE_CONNECTION_ERROR_SHUTDOWN);
        return { action: ErrorAction.Shutdown };
    }

    public closed(): CloseHandlerResult {
        this.restarts.push(Date.now());
        if (this.restarts.length <= this.maxRestartCount) {
            this.analytics.logEvent(EventType.ERROR_WAKE_CONNECTION_CLOSE_RESTART);
            return { action: CloseAction.Restart };
        } else {
            const diff = this.restarts[this.restarts.length - 1] - this.restarts[0];
            if (diff <= 3 * 60 * 1000) {
                this.analytics.logEvent(EventType.ERROR_WAKE_CONNECTION_CLOSE_DO_NOT_RESTART);
                return {
                    action: CloseAction.DoNotRestart,
                    message: `The ${this.client?.name} server crashed ${
                        this.maxRestartCount + 1
                    } times in the last 3 minutes. The server will not be restarted. See the output for more information.`
                };
            } else {
                this.analytics.logEvent(EventType.ERROR_WAKE_CONNECTION_CLOSE_RESTART);
                this.restarts.shift();
                return { action: CloseAction.Restart };
            }
        }
    }

    public setClient(client: BaseLanguageClient) {
        this.client = client;
    }
}
