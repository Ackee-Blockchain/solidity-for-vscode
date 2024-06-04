
import type { ContractFunctionInput } from '../../shared/types';
import type { AbiFunctionFragment } from 'web3-types';
import { encodeFunctionCall, encodeParameters } from 'web3-eth-abi';

export function buildTree(abi: AbiFunctionFragment): RootInputHandler {
    const root = new RootInputHandler(abi);
    return root;
}

function createInput(input: ContractFunctionInput) {
    // Is dynamic list?
    if (input.type?.endsWith('[]')) {
        const listElementType = input.type.slice(0, -2);
        return new DynamicListInputHandler({
            ...input,
            listElementType,
        });
    }

    // Is static list?
    const match = input.type?.match(/\[(\d+)\]$/);
    if (match) {
        const listLength = parseInt(match[1]);
        const listElementType = input.type.slice(0, -match[0].length);
        return new StaticListInputHandler({
            ...input,
            listLength,
            listElementType,
        });
    }

    // Contains components?
    if (input.components && input.components.length) {
        return new ComponentInputHandler({
            ...input
        });
    }

    // Else, normal input

    // is number
    // const _numberTypes = ['uint8', 'uint16', 'uint32', 'uint64', 'uint128', 'uint256', 'int8', 'int16', 'int32', 'int64', 'int128', 'int256', 'uint', 'int'];
    // if (_numberTypes.includes(input.type)) {
    //     return new IntegerLeafInputHandler({
    //         ...input
    //     });
    // }

    return new LeafInputHandler({
        ...input
    });
}

export abstract class InputHandler {
    public internalType!: InputTypesInternal;
    public name: string | undefined;
    public type: string | undefined;
    public children: Array<InputHandler>;
    public parent: InputHandler | undefined;
    protected _abiParameter: any;

    constructor(data: any) {
        this._abiParameter = data;

        this.name = data?.name;
        this.type = data?.type;
        this.children = [];

        this._beforeBuildTree(data);

        this._buildTree();
    }

    protected addChild(input: InputHandler) {
        this.children.push(input);
        input.parent = this;
    }

    public description() {
        return this.name ? `${this.name}: ${this.type}` : this.type;
    }

    public abstract get(): string | undefined;

    public abstract getValues(): any;

    public abstract set(value: string): void;

    protected abstract _buildTree(): void;

    protected _beforeBuildTree(data: any) {};
}

class LeafInputHandler extends InputHandler {
    protected _value: string | undefined;

    constructor(data: any) {
        super(data);

        this.internalType = InputTypesInternal.LEAF;
    }

    public get() {
        // TODO: should return based on type
        return this._value;
    }

    public getValues(): any {
        return this._value;
    }

    public set(value: string) {
        // TODO: validation based on type (strings should have "" etc.)
        if (value === '') {
            this._value = undefined;
            return;
        }

        this._value = value;
    }

    protected _buildTree() {
    }
}

export class RootInputHandler extends InputHandler {
    private _abi: AbiFunctionFragment;

    constructor(abi: AbiFunctionFragment) {
        super(abi.inputs);
        this._abi = abi;
        this.internalType = InputTypesInternal.ROOT;
    }

    public get() {
        if (this.children.every((child: InputHandler) => child.get() === undefined)) {
            return undefined;
        }

        return `${this.children.map((child: InputHandler) => child.get()).join(',')}`;
    }

    public getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    public set(value: string) {
        if (value === undefined || value === '') {
            this.children.forEach((child: InputHandler) => child.set(''));
            return;
        }

        const values = value.split(',');

        // TODO: add additional validation via regex here
        // type validation should be done at the leaf level
        if (values.length !== this.children.length) {
            throw new FunctionInputParseError('RootInput: Invalid input length');
        }

        this.children.forEach((child: InputHandler, index: number) => {
            child.set(values[index]);
        });
    }

    /*
    * Encodes the input values
    * Includes function selector
    *
    * @returns {string} - Encoded calldata
    */
    public calldata(): string {
        const _calldata = encodeFunctionCall(
            this._abi,
            this.getValues(),
        );
        return _calldata.slice(2); // remove 0x
    }

    /*
    * Encodes the input values into
    * Does not include function selector (used in constructor)
    *
    * @returns {string} - Encoded parameters
    */
    public encodedParameters(): string {
        const _encodedParams = encodeParameters(
            this._abi.inputs?.map((input: any) => input.type) || [],
            this.getValues(),
        );
        return _encodedParams.slice(2); // remove 0x
    }


    protected _buildTree() {
        if (!this._abiParameter || !Array.isArray(this._abiParameter)) {
            throw new FunctionInputBuildError('RootInput: ABI is not defined or empty');
        }

        this._abiParameter.forEach((input: any) => {
            this.addChild(createInput(input));
        });
    }

    public override description() {
        return this.children.map((child: InputHandler) => child.type).join(',');
    }
}

class ComponentInputHandler extends InputHandler {
    constructor(data: any) {
        super(data);

        this.internalType = InputTypesInternal.COMPONENT;
    }

    public get() {
        if (this.children.every((child: InputHandler) => child.get() === undefined)) {
            return undefined;
        }

        return `(${this.children.map((child: InputHandler) => child.get()).join(',')})`;
    }

    public getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    public set(value: string) {
        if (value === undefined || value === '') {
            this.children.forEach((child: InputHandler) => child.set(''));
            return;
        }

        // TODO: add more complex validation
        const match = value.match(/^\((.*)\)$/);
        if (!match) {
            throw new FunctionInputParseError('ComponentInput: Invalid input format');
        }

        const values = value.slice(1, -1).split(',');

        if (values.length !== this.children.length) {
            throw new FunctionInputParseError('ComponentInput: Invalid input length');
        }

        this.children.forEach((child: InputHandler, index: number) => {
            child.set(values[index]);
        });
    }

    protected _buildTree() {
        if (!this._abiParameter || !this._abiParameter.components) {
            throw new FunctionInputBuildError('ComponentInput: ABI is not defined or empty');
        }

        this._abiParameter.components.forEach((input: any) => {
            this.addChild(createInput(input));
        });
    }
}

class StaticListInputHandler extends InputHandler {
    public length!: number;
    private _listElement: any;

    constructor(data: any) {
        super(data);

        this.internalType = InputTypesInternal.STATIC_LIST;
    }

    protected override _beforeBuildTree(data: any) {
        this.length = data.listLength;
        this._listElement = {
            ...data,
            type: data.listElementType,
        };
    }

    public get() {
        if (this.children.every((child: InputHandler) => child.get() === undefined)) {
            return undefined;
        }

        return `[${this.children.map((child: InputHandler) => child.get()).join(',')}]`;
    }

    public getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    public set(value: string) {
        if (value === undefined || value === '') {
            this.children = [];
            this.length = 0;
            return;
        }

        // TODO: add more complex validation (possibly include length check?)
        const match = value.match(/^\[(.*)\]$/);
        if (!match) {
            throw new FunctionInputParseError('StaticListInput: Invalid input format');
        }

        const values = value.slice(1, -1).split(',');

        if (values.length !== this.length) {
            throw new FunctionInputParseError('StaticListInput: Invalid length of list');
        }

        this.children.forEach((child: InputHandler, index: number) => {
            child.set(values[index]);
        });
    }

    protected _buildTree() {
        if (!this.length || !this._listElement) {
            throw new FunctionInputBuildError('StaticListInput: length or listElement is not defined');
        }

        // create length children
        for (let i = 0; i < this.length; i++) {
            this.addChild(createInput({
                ...this._listElement,
                name: `${this._listElement.name}[${i}]`
            }));
        }
    }
}

export class DynamicListInputHandler extends InputHandler {
    public length!: number;
    private _listElement: any;

    constructor(data: any) {
        super(data);

        this.internalType = InputTypesInternal.DYNAMIC_LIST;
    }

    protected override _beforeBuildTree(data: any) {
        this.length = 1; // defaults to one initial element
        this._listElement = {
            ...data,
            type: data.listElementType,
        };
    }

    public get() {
        if (this.children.every((child: InputHandler) => child.get() === undefined)) {
            return undefined;
        }

        return `[${this.children.map((child: InputHandler) => child.get()).join(',')}]`;
    }

    public getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    public set(value: string) {
        if (value === undefined || value === '') {
            this.children = [];
            this.length = 0;
            return;
        }

        // TODO: add more complex validation (possibly include length check?)
        const match = value.match(/^\[(.*)\]$/);
        if (!match) {
            throw new FunctionInputParseError('DynamicListInput: Invalid input format');
        }

        const values = value.slice(1, -1).split(',');

        if (values.length < 1) {
            throw new FunctionInputParseError('DynamicListInput: Invalid length of list');
        }

        if (values.length === 1 && values[0] === '') {
            this.children = [];
            this.length = 0;
            return;
        }

        this.length = values.length;
        this.children = [];
        values.forEach((value: string, index: number) => {
            this.addChild(createInput({
                ...this._listElement,
                name: `${this._listElement.name}[${index}]`
            }));
            this.children[index].set(value);
        });
    }

    protected _buildTree() {
        if (!this.length || !this._listElement) {
            throw new FunctionInputBuildError('DynamicListInput: length or listElement is not defined');
        }

        // create length children
        for (let i = 0; i < this.length; i++) {
            this.addChild(createInput({
                ...this._listElement,
                name: `${this._listElement.name}[${i}]`
            }));
        }
    }

    public addElement() {
        this.addChild(createInput({
            ...this._listElement,
            name: `${this._listElement.name}[${this.length}]`
        }));

        this.length++;
    }

    public removeElement() {
        if (this.length <= 0) {
            return;
        }

        this.children.pop();
        this.length--;
    }
}

export enum InputTypesInternal {
    ROOT = "ROOT",
    COMPONENT = "COMPONENT",
    STATIC_LIST = "STATIC_LIST",
    DYNAMIC_LIST = "DYNAMIC_LIST",
    LEAF = "LEAF"
}

class FunctionInputBuildError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FunctionInputBuildError';
    }
}

class FunctionInputParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FunctionInputParseError';
    }
}