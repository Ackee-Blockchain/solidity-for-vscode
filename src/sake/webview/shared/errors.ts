export class FunctionInputBuildError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FunctionInputBuildError';
    }
}

export class FunctionInputParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FunctionInputParseError';
    }
}
