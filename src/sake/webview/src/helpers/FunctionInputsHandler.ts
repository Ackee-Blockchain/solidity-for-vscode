/* eslint-disable @typescript-eslint/naming-convention */

import type { ContractFunctionInput } from '../../shared/types';
import type { AbiFunctionFragment } from 'web3-types';
import { encodeFunctionCall, encodeParameters } from 'web3-eth-abi';
import { FunctionInputBuildError, FunctionInputParseError } from '../../shared/errors';
import { validateAndParseType } from '../../shared/validate';

enum InputState {
    EMPTY = 'EMPTY',
    VALID = 'VALID',
    INVALID = 'INVALID',
    MISSING_DATA = 'MISSING' // used for lists, structs and multi-inputs if some input is missing
}

export enum InputTypesInternal {
    ROOT = 'ROOT',
    MULTI = 'MULTI',
    COMPONENT = 'COMPONENT',
    STATIC_LIST = 'STATIC_LIST',
    DYNAMIC_LIST = 'DYNAMIC_LIST',
    LEAF = 'LEAF'
}

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

abstract class InputHandlerInterface {
    public abstract get description(): string;
    public abstract get errors(): string[];
    public abstract getString(): string | undefined;
    public abstract getValues(): any;
    public abstract set(value: string): boolean;
    public abstract get state(): InputState;
}

export abstract class InputHandler extends InputHandlerInterface {
    public internalType!: InputTypesInternal;
    public name: string | undefined;
    public type: string | undefined;
    public children: Array<InputHandler>;
    public parent: InputHandler | undefined;
    protected _abiParameter: any;
    protected _state: InputState;
    protected _error: string | undefined;
    protected _value: string | undefined;

    constructor(data: any) {
        super();
        this._abiParameter = data;
        this._state = InputState.EMPTY;

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

    public override get description(): string {
        if (this.type === undefined) {
            return '';
        }
        return this.name ? `${this.name}: ${this.type}` : this.type;
    }

    public get errors(): string[] {
        if (this.state !== InputState.INVALID) {
            return [];
        }

        if (this._error !== undefined) {
            return [this._error];
        }

        return this.children.reduce((errors: string[], child: InputHandler) => {
            return errors.concat(child.errors);
        }, []);
    }

    public isInvalid(): boolean {
        return this.state === InputState.INVALID;
    }

    public isValid(): boolean {
        return this.state === InputState.VALID;
    }

    /*
     * Returns the value of the input(s) as a string
     */
    public getString(): string | undefined {
        if (this.state === InputState.INVALID) {
            return this._value ?? this._getString();
        }

        if (this.state === InputState.EMPTY) {
            return '';
        }

        return this._getString();
    }

    protected abstract _getString(): string | undefined;

    /*
     * Returns the value of the input(s) as an object
     */
    public getValues(): any {
        if (this.state === InputState.INVALID) {
            return undefined;
        }

        return this._getValues();
    }

    protected abstract _getValues(): any;

    /**
     * Sets the value of the input and handles any errors that occur.
     * @param value - The value to set.
     * @returns A boolean indicating whether the value was set successfully.
     */
    public set(value: string): boolean {
        try {
            this._set(value);
            this._error = undefined;

            return true;
        } catch (e) {
            // save error message
            const errorMessage = typeof e === 'string' ? e : (e as Error).message;
            this._setErrors(errorMessage);

            // save invalid string
            this._value = value;

            // reset all children
            this.children.forEach((child: InputHandler) => child.set(''));

            return false;
        } finally {
            // console.log(
            //     'value set',
            //     this._value,
            //     'in',
            //     this.name,
            //     this.type,
            //     'with state',
            //     this.state,
            //     'parent state',
            //     this.parent?.state
            // );
            // @todo move state update here
        }
    }

    protected abstract _set(_value: string): void;

    protected _setErrors(error: string) {
        this._error = error;
        this.state = InputState.INVALID;
    }

    public get state(): InputState {
        return this._state;
    }

    protected set state(state: InputState) {
        if (this._state === state) {
            return;
        }
        this._state = state;
        this.parent?._updateState();
    }

    protected abstract _buildTree(): void;

    protected _beforeBuildTree(data: any) {}

    protected abstract _updateState(): void;

    // @dev used in svelte
    public expanded: boolean = false;
}

export class RootInputHandler extends InputHandlerInterface {
    private _abi: AbiFunctionFragment;
    private _child: InputHandler | undefined;

    constructor(abi: AbiFunctionFragment) {
        super();
        this._abi = abi;
        this._buildTree();
    }

    public getString() {
        // @dev return "" to not display "undefined"
        return this._child?.getString() ?? '';
    }

    public getValues(): any {
        if (!this.hasInputs()) {
            return undefined;
        }

        const _values = this._child?.getValues();

        // @dev returned data has to be an array of inputs
        return this.isMultiInput() ? _values : [_values];
    }

    public set(_value: string): boolean {
        const value = _value?.trim();
        return this._child?.set(value) ?? false;
    }

    public get errors(): string[] {
        return this._child?.errors ?? [];
    }

    public get state(): InputState {
        if (this._child === undefined) {
            throw new FunctionInputBuildError('Cannot get state of undefined child');
        }
        return this._child.state;
    }

    /*
     * Encodes the input values
     * Includes function selector
     *
     * @returns {string} - Encoded calldata
     */
    public calldata(): string {
        if (!this.hasInputs()) {
            return '';
        }

        if (this.state !== InputState.VALID) {
            throw new FunctionInputParseError('Input state is invalid');
        }

        const _calldata = encodeFunctionCall(this._correctedAbi, this.getValues() ?? []);

        return _calldata.slice(2); // remove 0x
    }

    /*
     * Returns raw calldata
     * Does not do any encoding
     * Used for raw calldata function call
     *
     * @returns {string}
     */
    public rawCalldata(): string {
        if (!this.hasInputs()) {
            return '';
        }

        if (this.state !== InputState.VALID) {
            throw new FunctionInputParseError('Input state is invalid');
        }

        const _calldata = this.getValues();
        console.log('raw calldata', this.getValues(), this.getValues()[0]);

        if (!Array.isArray(_calldata) || _calldata.length !== 1) {
            throw new FunctionInputParseError('Invalid data for raw calldata');
        }

        return _calldata[0].slice(2); // remove 0x
    }

    /*
     * Encodes the input values into
     * Does not include function selector (used in constructor)
     *
     * @returns {string} - Encoded parameters
     */
    public encodedParameters() {
        if (!this.hasInputs()) {
            return '';
        }

        if (this.state !== InputState.VALID) {
            throw new FunctionInputParseError('Input state is invalid');
        }

        const _encodedParams = encodeParameters(
            this._correctedAbi.inputs?.map((input: any) => input.type) ?? [],
            this.getValues() ?? []
        );

        return _encodedParams.slice(2); // remove 0x
    }

    /**
     * Function which corrects some ABI properties so they can be used in encoding
     * currently only used for function type
     *
     * @param abi - ABI of the function
     * @returns {AbiFunctionFragment} - Corrected ABI
     */
    private get _correctedAbi() {
        if (!this._abi.inputs) {
            return this._abi;
        }

        return {
            ...this._abi,
            inputs: this._abi.inputs.map((input: any) => {
                if (input.type === 'function') {
                    return {
                        ...input,
                        type: 'bytes24'
                    };
                }

                return input;
            })
        };
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
        return this._child?.description ?? '';
    }

    public isMultiInput() {
        return this._child?.internalType === InputTypesInternal.MULTI;
    }

    public hasInputs() {
        return this._child !== undefined;
    }

    /**
     * Return multi-inputs
     * @dev used in svelte
     */
    public get multiInputs() {
        if (this._child?.internalType !== InputTypesInternal.MULTI) {
            // return [];
            throw new FunctionInputBuildError('Cannot get multi-inputs from non-multi-input');
        }

        return this._child.children;
    }

    /**
     * Return single input
     * @dev used in svelte
     */
    public get singleInput() {
        if (this._child?.internalType === InputTypesInternal.MULTI) {
            // return undefined;
            throw new FunctionInputBuildError('Cannot get single input from multi-input');
        }

        return this._child!;
    }

    /**
     * Return child (either single or multi-input)
     * @dev used in svelte
     */
    public get inputs() {
        if (this._child === undefined) {
            throw new FunctionInputBuildError('Cannot get inputs from undefined child');
        }

        return this._child;
    }
}

class MultiInputHandler extends InputHandler {
    constructor(data: any) {
        super(data);

        this.internalType = InputTypesInternal.MULTI;
    }

    protected override _getString(): string | undefined {
        return `${this.children.map((child: InputHandler) => child.getString()).join(', ')}`;
    }

    protected override _getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    protected _set(_value: string): void {
        const value = _value?.trim();
        if (value === undefined || value === '') {
            this.children.forEach((child: InputHandler) => child.set(''));
            return;
        }

        const values = splitNestedLists(value);

        console.log('multi-input values', values, this.children.length, this.children);

        if (values.length !== this.children.length) {
            throw new FunctionInputParseError('Invalid length of multi-input');
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

    protected _updateState(): void {
        this.state = _getStateFromChildren(this.children);
    }
}

class LeafInputHandler extends InputHandler {
    // @todo remove _error and use errors

    constructor(data: any) {
        super(data);

        this.internalType = InputTypesInternal.LEAF;
    }

    protected override _getString() {
        // @dev this cannot return undefined, because you then get smth like [(,[],[()])] displayed at the root
        if (this.type === 'string' && this._value !== undefined && this._value !== '""') {
            return `"${this._value}"`;
        }

        return this._value;
    }

    protected override _getValues() {
        return this._value;
    }

    protected _set(_value: string) {
        let value = _value?.trim();

        if (value === '') {
            this._value = undefined;
            this.state = InputState.EMPTY;
            this._error = undefined;
            return;
        }

        value = validateAndParseType(value, this.type!);

        this._value = value;
        this.state = InputState.VALID;
    }

    public override get errors(): string[] {
        if (this.state !== InputState.INVALID) {
            return [];
        }

        return this._error ? [this._error] : [];
    }

    protected override _buildTree() {}

    protected override _updateState(): void {}
}

class ComponentInputHandler extends InputHandler {
    constructor(data: any) {
        super(data);
        this.internalType = InputTypesInternal.COMPONENT;
    }

    protected override _getString() {
        return `(${this.children.map((child: InputHandler) => child.getString()).join(', ')})`;
    }

    protected override _getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    protected _set(_value: string) {
        const value = _value?.trim();

        if (value === undefined || value === '') {
            this.children.forEach((child: InputHandler) => child.set(''));
            return;
        }

        const _values = splitNestedLists(value);

        if (_values.length !== this.children.length) {
            throw new FunctionInputParseError('Invalid length of struct');
        }

        this.children.forEach((child: InputHandler, index: number) => {
            child.set(_values[index]);
        });
    }

    protected _buildTree() {
        if (!this._abiParameter || !this._abiParameter.components) {
            throw new FunctionInputBuildError('ABI is not defined or empty');
        }

        this._abiParameter.components.forEach((input: any) => {
            this.addChild(createInput(input));
        });
    }

    protected _updateState(): void {
        this.state = _getStateFromChildren(this.children);
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

    protected override _getString() {
        return `[${this.children.map((child: InputHandler) => child.getString()).join(', ')}]`;
    }

    protected override _getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    protected _set(_value: string) {
        const value = _value?.trim();

        const _values = splitNestedLists(value);

        if (_values.length !== this.length) {
            throw new FunctionInputParseError('Invalid length of static list');
        }

        this.children.forEach((child: InputHandler, index: number) => {
            child.set(_values[index]);
        });
    }

    protected _buildTree() {
        if (!this.length || !this._listElement) {
            throw new FunctionInputBuildError('Static list length or listElement is not defined');
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

    protected _updateState(): void {
        this.state = _getStateFromChildren(this.children);
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

    protected override _getString() {
        if (this.state === InputState.EMPTY) {
            return '';
        }

        return `[${this.children.map((child: InputHandler) => child.getString()).join(', ')}]`;
    }

    protected override _getValues() {
        return this.children.map((child: InputHandler) => child.getValues());
    }

    protected _set(_value: string) {
        const value = _value?.trim();

        if (value === undefined || value === '' || value === '[]') {
            this.children = [];
            this.length = 0;
            this.state = InputState.VALID;
            return;
        }

        const _values = splitNestedLists(value);

        if (_values.length < 1) {
            throw new FunctionInputParseError('Invalid length of list');
        }

        if (_values.length === 1 && _values[0] === '') {
            this.children = [];
            this.length = 0;
            this.state = InputState.VALID;
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
            throw new FunctionInputBuildError('Dynamic list length or listElement is not defined');
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

    protected _updateState(): void {
        this.state = _getStateFromChildren(this.children);
    }
}

function _getStateFromChildren(children: Array<InputHandler>) {
    if (children.some((child: InputHandler) => child.state === InputState.INVALID)) {
        return InputState.INVALID;
    }

    if (children.every((child: InputHandler) => child.state === InputState.VALID)) {
        return InputState.VALID;
    }

    if (children.every((child: InputHandler) => child.state === InputState.EMPTY)) {
        return InputState.EMPTY;
    }

    return InputState.MISSING_DATA;
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
