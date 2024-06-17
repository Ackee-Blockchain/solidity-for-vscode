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
            listElementType
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
            listElementType
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

    public get description() {
        return this.name ? `${this.name}: ${this.type}` : this.type;
    }

    /*
     * Returns the value of the input(s) as a string
     */
    public abstract getString(): string | undefined;

    /*
     * Returns the value of the input(s) as an object
     */
    public abstract getValues(): any;

    public abstract set(value: string): void;

    protected abstract _buildTree(): void;

    protected _beforeBuildTree(data: any) {}
}

export class RootInputHandler {
    private _abi: AbiFunctionFragment;
    private _child: InputHandler | undefined;

    constructor(abi: AbiFunctionFragment) {
        this._abi = abi;
        console.log('abi', abi);
        this._buildTree();
    }

    public getString() {
        // @dev return "" to not display "undefined"
        return this._child?.getString() || '';
    }

    public getValues() {
        if (!this.hasInputs()) {
            return undefined;
        }

        const _values = this._child?.getValues();
        // @dev returned data has to be an array of inputs
        return this.isMultiInput() ? _values : [_values];
    }

    public set(value: string) {
        value = value?.trim();
        this._child?.set(value);
    }

    /*
     * Encodes the input values
     * Includes function selector
     *
     * @returns {string} - Encoded calldata
     */
    public calldata(): string {
        const _calldata = encodeFunctionCall(this._abi, this.getValues() || []);

        return _calldata.slice(2); // remove 0x
    }

    /*
     * Encodes the input values into
     * Does not include function selector (used in constructor)
     *
     * @returns {string} - Encoded parameters
     */
    public encodedParameters() {
        const _encodedParams = encodeParameters(
            this._abi.inputs?.map((input: any) => input.type) || [],
            this.getValues() || []
        );

        return _encodedParams.slice(2); // remove 0x
    }

    protected _buildTree() {
        if (this._abi.inputs === undefined || !Array.isArray(this._abi.inputs)) {
            throw new FunctionInputBuildError('RootInput: ABI is not defined or empty');
        }

        if (this._abi.inputs.length === 0) {
            return;
        }

        if (this._abi.inputs.length === 1) {
            this._child = createInput(this._abi.inputs[0]);
            return;
        }

        this._child = new MultiInputHandler(this._abi.inputs);
    }

    public get description() {
        return this._child?.description;
    }

    public isMultiInput() {
        return this._child?.internalType === InputTypesInternal.MULTI;
    }

    public hasInputs() {
        return this._child !== undefined;
    }

    public get multiInputs() {
        if (this._child?.internalType !== InputTypesInternal.MULTI) {
            // return [];
            throw new FunctionInputBuildError('RootInput: Not a multi input');
        }

        return this._child.children;
    }

    public get singleInput() {
        if (this._child?.internalType === InputTypesInternal.MULTI) {
            // return undefined;
            throw new FunctionInputBuildError('RootInput: Not a single input');
        }

        return this._child!;
    }

    // TODO remove if unused
    public isExpandable() {
        return (
            this._child?.internalType === InputTypesInternal.DYNAMIC_LIST ||
            this._child?.internalType === InputTypesInternal.MULTI
        );
        this._child?.internalType === InputTypesInternal.MULTI;
    }
}

class MultiInputHandler extends InputHandler {
    constructor(data: any) {
        super(data);

        this.internalType = InputTypesInternal.MULTI;
    }

    public getString(): string | undefined {
        if (this.children.every((child: InputHandler) => child.getString() === undefined)) {
            return undefined;
        }

        return `${this.children.map((child: InputHandler) => child.getString()).join(',')}`;
    }

    public getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    public set(value: string): void {
        value = value?.trim();
        if (value === undefined || value === '') {
            this.children.forEach((child: InputHandler) => child.set(''));
            return;
        }

        const values = splitNestedLists(value);

        // TODO: add additional validation via regex here
        // type validation should be done at the leaf level
        if (values.length !== this.children.length) {
            throw new FunctionInputParseError('MultiInput: Invalid input length');
        }

        this.children.forEach((child: InputHandler, index: number) => {
            child.set(values[index]);
        });
    }

    protected _buildTree() {
        if (!this._abiParameter || !Array.isArray(this._abiParameter)) {
            throw new FunctionInputBuildError('MultiInput: ABI is not defined or empty');
        }

        this._abiParameter.forEach((input: any) => {
            this.addChild(createInput(input));
        });
    }

    public override get description() {
        return this.children.map((child: InputHandler) => child.type).join(', ');
    }
}

class LeafInputHandler extends InputHandler {
    protected _value: string | undefined;

    constructor(data: any) {
        super(data);

        this.internalType = InputTypesInternal.LEAF;
        console.log('leaf type', this.type);
    }

    public getString() {
        console.log('leaf value', this._value);
        // @todo should return based on type
        // @dev this cannot return undefined, because you then get smth like [(,[],[()])] displayed at the root
        if (this.type === 'string' && this._value !== undefined && this._value !== '""') {
            return `"${this._value}"`;
        }
        return this._value;
    }

    public getValues(): any {
        return this._value;
    }

    public set(value: string) {
        // TODO: validation based on type (strings should have "" etc.)
        // remove trailing and leading whitespaces
        value = value?.trim();

        if (value === '') {
            this._value = undefined;
            return;
        }

        value = this._validateType(value);

        // remove enclosing quotes

        this._value = value;
    }

    protected _buildTree() {}

    private _validateType(value: string): string {
        switch (this.type) {
            case 'string':
                if (value === '""') {
                    return '';
                }

                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }

                return value;

            case 'bool':
                value = value.toLowerCase();
                if (value !== 'true' && value !== 'false') {
                    throw new FunctionInputParseError('LeafInput: Invalid boolean value');
                }
                return value;

            case 'address':
                // check if it starts with 0x
                if (!value.startsWith('0x')) {
                    value = '0x' + value;
                }

                // regex to check if it is a valid address
                const match = value.match(/^0x[0-9a-fA-F]{40}$/);
                if (!match) {
                    throw new FunctionInputParseError('LeafInput: Invalid address');
                }

                return value;

            case 'bytes':
            case 'bytes1':
            case 'bytes2':
            case 'bytes3':
            case 'bytes4':
            case 'bytes5':
            case 'bytes6':
            case 'bytes7':
            case 'bytes8':
            case 'bytes9':
            case 'bytes10':
            case 'bytes11':
            case 'bytes12':
            case 'bytes13':
            case 'bytes14':
            case 'bytes15':
            case 'bytes16':
            case 'bytes17':
            case 'bytes18':
            case 'bytes19':
            case 'bytes20':
            case 'bytes21':
            case 'bytes22':
            case 'bytes23':
            case 'bytes24':
            case 'bytes25':
            case 'bytes26':
            case 'bytes27':
            case 'bytes28':
            case 'bytes29':
            case 'bytes30':
            case 'bytes31':
            case 'bytes32':
                // check if it starts with 0x
                if (!value.startsWith('0x')) {
                    value = '0x' + value;
                }

                // regex to check if it is a valid bytes
                const matchBytes = value.match(/^0x[0-9a-fA-F]*$/);
                if (!matchBytes) {
                    throw new FunctionInputParseError('LeafInput: Invalid bytes');
                }

                return value;

            case 'uint':
            case 'uint8':
            case 'uint16':
            case 'uint32':
            case 'uint64':
            case 'uint128':
            case 'uint256':
                // @todo validate uint
                // check if it is a number
                if (isNaN(parseInt(value))) {
                    throw new FunctionInputParseError('LeafInput: Invalid uint');
                }

                // check if it is a positive number
                if (parseInt(value) < 0) {
                    throw new FunctionInputParseError('LeafInput: Uint should be positive');
                }

                return value;

            case 'int':
            case 'int8':
            case 'int16':
            case 'int32':
            case 'int64':
            case 'int128':
            case 'int256':
                // check if it is a number
                if (isNaN(parseInt(value))) {
                    throw new FunctionInputParseError('LeafInput: Invalid int');
                }

                return value;

            default:
                // @todo
                return value;
        }
    }
}

class ComponentInputHandler extends InputHandler {
    constructor(data: any) {
        super(data);
        this.internalType = InputTypesInternal.COMPONENT;
    }

    public getString() {
        if (this.children.every((child: InputHandler) => child.getString() === undefined)) {
            return undefined;
        }

        return `(${this.children.map((child: InputHandler) => child.getString()).join(',')})`;
    }

    public getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    public set(value: string) {
        value = value?.trim();

        if (value === undefined || value === '') {
            this.children.forEach((child: InputHandler) => child.set(''));
            return;
        }

        // TODO: add more complex validation
        // TODO why do i actually need this?
        const match = value.match(/^\((.*)\)$/);
        if (!match) {
            throw new FunctionInputParseError('ComponentInput: Invalid input format');
        }

        const _values = splitNestedLists(value);

        if (_values.length !== this.children.length) {
            throw new FunctionInputParseError('ComponentInput: Invalid input length');
        }

        this.children.forEach((child: InputHandler, index: number) => {
            child.set(_values[index]);
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
            type: data.listElementType
        };
    }

    public getString() {
        if (this.children.every((child: InputHandler) => child.getString() === undefined)) {
            return undefined;
        }

        return `[${this.children.map((child: InputHandler) => child.getString()).join(',')}]`;
    }

    public getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    public set(value: string) {
        value = value?.trim();

        if (value === undefined || value === '') {
            this.children = [];
            this.length = 0;
            return;
        }

        const _values = splitNestedLists(value);

        if (_values.length !== this.length) {
            throw new FunctionInputParseError('StaticListInput: Invalid length of list');
        }

        this.children.forEach((child: InputHandler, index: number) => {
            child.set(_values[index]);
        });
    }

    protected _buildTree() {
        if (!this.length || !this._listElement) {
            throw new FunctionInputBuildError(
                'StaticListInput: length or listElement is not defined'
            );
        }

        // create length children
        for (let i = 0; i < this.length; i++) {
            this.addChild(
                createInput({
                    ...this._listElement,
                    name: `${this._listElement.name}[${i}]`
                })
            );
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
            type: data.listElementType
        };
    }

    public getString() {
        if (this.children.every((child: InputHandler) => child.getString() === undefined)) {
            return undefined;
        }

        return `[${this.children.map((child: InputHandler) => child.getString()).join(',')}]`;
    }

    public getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    public set(value: string) {
        value = value?.trim();

        if (value === undefined || value === '' || value === '[]') {
            this.children = [];
            this.length = 0;
            return;
        }

        const _values = splitNestedLists(value);

        if (_values.length < 1) {
            throw new FunctionInputParseError('DynamicListInput: Invalid length of list');
        }

        if (_values.length === 1 && _values[0] === '') {
            this.children = [];
            this.length = 0;
            return;
        }

        this.length = _values.length;
        this.children = [];
        _values.forEach((value: string, index: number) => {
            this.addChild(
                createInput({
                    ...this._listElement,
                    name: `${this._listElement.name}[${index}]`
                })
            );
            this.children[index].set(value);
        });
    }

    protected _buildTree() {
        if (!this.length || !this._listElement) {
            throw new FunctionInputBuildError(
                'DynamicListInput: length or listElement is not defined'
            );
        }

        // create length children
        for (let i = 0; i < this.length; i++) {
            this.addChild(
                createInput({
                    ...this._listElement,
                    name: `${this._listElement.name}[${i}]`
                })
            );
        }
    }

    public addElement() {
        this.addChild(
            createInput({
                ...this._listElement,
                name: `${this._listElement.name}[${this.length}]`
            })
        );

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

function splitNestedLists(input: string): string[] {
    // remove leading and trailing whitespaces
    input = input.trim();

    // remove enclosing brackets () or []
    if (
        (input.startsWith('(') && input.endsWith(')')) ||
        (input.startsWith('[') && input.endsWith(']'))
    ) {
        input = input.slice(1, -1);
    }

    const result: string[] = [];
    let currentItem = '';
    let depth = 0;

    for (const char of input) {
        currentItem += char;
        if (char === '[' || char === '(') {
            depth++;
        }
        if (char === ']' || char === ')') {
            depth--;
        }

        if (depth === 0 && char === ',') {
            result.push(currentItem.slice(0, -1));
            currentItem = '';
        }
    }

    if (currentItem !== '') {
        result.push(currentItem);
    }

    return result;
}

export enum InputTypesInternal {
    ROOT = 'ROOT',
    MULTI = 'MULTI',
    COMPONENT = 'COMPONENT',
    STATIC_LIST = 'STATIC_LIST',
    DYNAMIC_LIST = 'DYNAMIC_LIST',
    LEAF = 'LEAF'
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
