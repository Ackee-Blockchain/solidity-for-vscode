# Solidity by Ackee Blockchain Security

[![Discord Badge](https://img.shields.io/discord/867746290678104064?colorA=21262d&colorB=0000FF&style=flat)](https://discord.gg/x7qXXnGCsa)
[![Visual Studio Marketplace Badge](https://img.shields.io/visual-studio-marketplace/d/AckeeBlockchain.tools-for-solidity?colorA=21262d&colorB=0000FF&style=flat)](https://marketplace.visualstudio.com/items?itemName=AckeeBlockchain.tools-for-solidity)
[![Follow on X Badge](https://img.shields.io/badge/Follow%20on%20X-for%20release%20updates-0000FF?colorA=21262d&style=flat)](https://x.com/WakeFramework)

![Solidity for VS Code](images/readme/solidity_wake.gif)

Ethereum Solidity and local node testing with security features for Visual Studio Code.

This extension adds language support for Solidity to Visual Studio Code, and provides a Remix-like experience for testing contracts on your local network.
Benefits:
- [Test and interact with your smart contracts on an Ethereum local node](#test-and-interact-with-your-smart-contracts-on-an-ethereum-local-node)
  - [Compile and deploy contracts](#compile-and-deploy-contracts)
  - [Interact with contracts](#interact-with-contracts)
- [See vulnerabilities from static analysis in real-time](#see-vulnerabilities-from-static-analysis-in-real-time)
  - [Compilation Errors](#compilation-errors)
  - [See vulnerabilities from static analysis in real-time](#see-vulnerabilities-from-static-analysis-in-real-time-1)
  - [Security Overview in the Sidebar](#security-overview-in-the-sidebar)
- [Best code navigation experience, call-graphs and more](#best-code-navigation-experience-call-graphs-and-more)
  - [Go to definition](#go-to-definition)
  - [Find references](#find-references)
  - [Document Links](#document-links)
  - [Hover](#hover)
  - [Contract Outline](#contract-outline)
  - [Code Lens](#code-lens)
  - [Graphs](#graphs)

## Test and interact with your smart contracts on an Ethereum local node

### Compile and deploy contracts

Compile your contracts and deploy them on a local chain for testing

![Compile and deploy contracts](images/readme/sake/1-compile-deploy.gif)


### Interact with contracts

Test your deployed contracts by interacting with them using function calls with different inputs

![Interact with contracts](images/readme/sake/2-interact.gif)

## See vulnerabilities from static analysis in real-time

### Free detections with leading security tool Wake

Catch potential issues early with real-time static analysis

![Real-time detectors](images/readme/diagnostics/2-realtime-detectors.gif)

### Security Overview in the Sidebar

Get an overall overview of issues in your project

![Security overview in the sidebar](images/readme/diagnostics/3-sidebar-overview.gif)

### Compilation Errors

See compilation errors highlighted in code

![Compilation errors](images/readme/diagnostics/1-compilation-errors.gif)

## Best code navigation experience, call-graphs and more

### Go to definition

Quickly navigate to any function or variable definition with a click

![Go to definition](images/readme/development/go_to_definition.gif)

### Find references

Right click to see a context menu, and use it to find all references

![Find references](images/readme/development/references.gif)

### Document Links

Click and jump to linked files and resources

![Document links](images/readme/development/document_links.gif)

### Hover

Use hover to see instant documentation in your code

![Hover](images/readme/development/hover.gif)

### Contract Outline

Navigate big projects with ease using the Contract Outline

![Contract outline](images/readme/development/outline.gif)

### Code Lens

Code Lens shows you relevant information like functions selectors and parameter references inside your code

![Code Lens](images/readme/development/codelens.gif)

### Graphs

Visualise contract inheritance and function control flows with graphs

![Graphs](images/readme/development/graph.gif)


## Requirements

The Solidity extension uses the PyPi package [eth-wake](https://pypi.org/project/eth-wake/) which requires Python 3.8 or higher. This package is automatically installed via [conda](https://conda.github.io/conda-pack/) by default.

Rosetta is required to be enabled on Apple Silicon Macs.

## Credits
[juanfranblanco/vscode-solidity](https://github.com/juanfranblanco/vscode-solidity/blob/master/syntaxes/solidity.json): a base of our Solidity grammar

[joaompinto/vscode-graphviz](https://github.com/joaompinto/vscode-graphviz): a base of our Graphviz integration


## Feedback, help and news
Get help and give feedback in our [Discord](https://discord.gg/x7qXXnGCsa)

Follow Ackee on [Twitter](https://twitter.com/AckeeBlockchain)


## Known Issues

- **`Go to references`, number of references and other features do not work correctly with no workspace open**

It is always recommended to open a project as a folder (`File -> Open folder`). `Open file` should only be used when opening a single file or several files inside the same folder.

- **Analysis does not work when the workspace contains compilation errors**

The extension relies on the `solc` compiler. For this reason, files containing compilation errors and files importing these files cannot be analyzed.
