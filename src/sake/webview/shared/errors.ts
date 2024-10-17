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

export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

export class SakeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SakeError';
    }
}
