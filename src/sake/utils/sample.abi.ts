export const sampleAbi: any = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "int256",
          "name": "b",
          "type": "int256"
        }
      ],
      "name": "a",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "int256",
          "name": "n",
          "type": "int256"
        },
        {
          "internalType": "bool",
          "name": "correct",
          "type": "bool"
        }
      ],
      "name": "b",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "a",
              "type": "uint256"
            },
            {
              "internalType": "uint256[]",
              "name": "b",
              "type": "uint256[]"
            },
            {
              "components": [
                {
                  "internalType": "string",
                  "name": "a",
                  "type": "string"
                }
              ],
              "internalType": "struct Foo.Nested[]",
              "name": "c",
              "type": "tuple[]"
            }
          ],
          "internalType": "struct Foo.S[]",
          "name": "s",
          "type": "tuple[]"
        }
      ],
      "name": "bar",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256[3][]",
          "name": "arr",
          "type": "uint256[3][]"
        }
      ],
      "name": "baz",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "int256",
          "name": "",
          "type": "int256"
        },
        {
          "internalType": "bool",
          "name": "correct",
          "type": "bool"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "a",
              "type": "uint256"
            },
            {
              "internalType": "uint256[]",
              "name": "b",
              "type": "uint256[]"
            },
            {
              "components": [
                {
                  "internalType": "string",
                  "name": "a",
                  "type": "string"
                }
              ],
              "internalType": "struct Foo.Nested[]",
              "name": "c",
              "type": "tuple[]"
            }
          ],
          "internalType": "struct Foo.S",
          "name": "s",
          "type": "tuple"
        }
      ],
      "name": "complex",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "contract Foo",
          "name": "f",
          "type": "address"
        }
      ],
      "name": "corge",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "a",
              "type": "uint256"
            },
            {
              "internalType": "uint256[]",
              "name": "b",
              "type": "uint256[]"
            },
            {
              "components": [
                {
                  "internalType": "string",
                  "name": "a",
                  "type": "string"
                }
              ],
              "internalType": "struct Foo.Nested[]",
              "name": "c",
              "type": "tuple[]"
            }
          ],
          "internalType": "struct Foo.S",
          "name": "s",
          "type": "tuple"
        }
      ],
      "name": "foo",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "noInput",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "function (uint256) pure external returns (uint256)",
          "name": "f",
          "type": "function"
        }
      ],
      "name": "quux",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum Foo.E",
          "name": "e",
          "type": "uint8"
        }
      ],
      "name": "qux",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256[]",
          "name": "a",
          "type": "uint256[]"
        }
      ],
      "name": "simpleList",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
