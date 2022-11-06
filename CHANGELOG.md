# Change Log

## [1.2.0]
- Added new [Head Overflow Calldata Tuple ABI-Reencoding Bug](https://blog.soliditylang.org/2022/08/08/calldata-tuple-reencoding-head-overflow-bug/) detector
- Added `woke.detectors.exclude` and `woke.detectors.only` config options to exclude some detectors from the analysis / to only run certain detectors
- Added new Axelar `contractId` detector
- Added LSP code lens with click-to-copy selectors above each (public/external) function / variable / error / event declaration
- LSP diagnostics originating from the solc compiler run are now marked with the `Woke(solc)` label
- Added `woke.lsp.force_rerun_detectors` LSP command
- Improved detection of ownable pattern

## [1.1.0]

- Implemented LSP commands to generate:
    - function control flow graphs
    - contract inheritance graph
    - contract C3 linearized inheritance graph
    - inheritance graph of a whole project
- Improved re-entrancy and ownable detectors
- LSP code lens no longer disappear when editing a file
    - enabled LSP code lens by default
- Fixed a compilation bug when a project contains multiple files with the same content
- Other small fixes

## [1.0.2]

- Extension description updated

## [1.0.1]

- Fixed LSP features for Solidity symbols in inline assembly blocks not working
- Fixed compiler errors not properly cleared

## [1.0.0]

- Initial release