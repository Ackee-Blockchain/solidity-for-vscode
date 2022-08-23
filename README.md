# Ackee Blockchain Tools for Solidity

ABCH tools for Solidity is a [Visual Studio Code](https://code.visualstudio.com/) plugin that implements a language server for Solidity. 

**This extension provides the following features:**

- Go to definition
- Go to type definition
- Go to implementation 
- Find references
- Type hierarchy
- Document links
- Code lens
- Document symbols
- Diagnostics
- Rename

## Dependencies

The ABCH Tools extension uses the PyPi package [abch-woke](https://pypi.org/project/abch-woke/) which requires Python 3.7 or higher.

## Installation

The package [abch-woke](https://pypi.org/project/abch-woke/) is installed `automatically` when this extension is activated. 

Alternatively, it can be installed `manually` using: 

```shell
python3 -m pip install abch-woke
```

## Features 

### Go to definition

![Go to definition preview](images/go-to-definition.gif)

### Go to type definition

![Go to type definition preview](images/go-to-type-definition.gif)

### Go to implementation

Find implementations of an unimplemented function or modifier.

![Go to implementation preview](images/go-to-implementation.gif)

### Find references

![Find references preview](images/find-references.gif)

### Type hierarchy

![Contract type hierarchy preview](images/contract-type-hierarchy.gif)

Also works for virtual functions.

![Function type hierarchy preview](images/function-type-hierarchy.gif)

### Document links

![Document links preview](images/document-links.gif)

### Hover

Includes links to documentation for OpenZeppelin contracts.

![Hover preview](images/hover.gif)

### Code lens

Number of references is shown above each declaration.

![Code lens preview](images/code-lens.png)

### Document symbols

![Document symbols preview](images/document-symbols.png)

### Diagnostics

![Diagnostics preview](images/diagnostics-1.gif)

![Diagnostics preview](images/diagnostics-2.png)

### Rename

![Rename preview](images/rename.gif)

## Supported commands

- **Woke: Force Recompile Project**

```shell
woke.lsp.force_recompile
``` 
Force recompile the opened project/files.

## Known Issues

- **Files created/modified/deleted outside of VS Code are not properly analysed**

The extension currently does not handle changes external to VS Code. This especially means that files installed into `node_modules` are not detected. Please run the `Woke: Force Recompile Project` command after installing node packages as a workaround.

- **`Go to references`, number of references and other features do not work correctly with no workspace open**

It is always recommended to open a project as a folder (`File -> Open folder`). `Open file` should only be used when opening a single file or several files inside the same folder.

- **Analysis does not work when the workspace contains compilation errors**

The extension relies on the `solc` compiler. For this reason, files containing compilation errors and files importing these files cannot be analysed.

## Acknowledgements

We used [juanfranblanco/vscode-solidity](https://github.com/juanfranblanco/vscode-solidity/blob/master/syntaxes/solidity.json) as a base of our Solidity grammar.