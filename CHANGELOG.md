# Change Log

## [1.7.1]
- Fixed an issue when the first `woke` installation found was taken as canonical instead of searching for other installation locations

## [1.7.0]
- Added experimental support for Python 3.11
- Fixed potential problems with `woke` installation, especially on macOS

## [1.6.0]
- Added support for Solidity 0.8.19
- Added new command `Tools for Solidity: Generate Imports Graph`
- Improved highlighted range of some vulnerability/code quality detections

## [1.5.0]
- Updated minimal version of Woke to 2.0.0
    - Some LSP features may be available during compilation
    - Stability improvements
- Added `woke.detectors.ignore_paths` and `woke.lsp.compilation_delay` config options
- Added `venv` to `woke.compiler.ignore_paths` config default value
- Added `joaompinto.vscode-graphviz` to extension dependencies

## [1.4.0]
- Introduced new `Tools for Solidity: Import Foundry Remappings` command to automatically configure remappings for Foundry projects
- Added `lib` directory to default `ignore_paths`
- Fixed an issue when `woke` instances would have been left running on an LSP server crash

## [1.3.1]
- Fixed Woke auto-install not working with `python` executable (without `python3` alias)
- Fixed reusing LSP build artifacts causing code lens glitches

## [1.3.0]
- EXPERIMENTAL: Use old LSP compilation artifacts when cannot successfully compile current version of sources
    - Implemented for `Go to definition`, `Document links` (imports), `Hover` and `Go to type definition`
- Reduced LSP server compilation time by merging compilation units
- Ignore all detections originating in `ignore_paths` and having all subdetections also in `ignore_paths`
- Fixed re-entrancy detector not able to detect issues in overridden functions
- Fixed LSP list config options parsing issue

## [1.2.1]
- Fixed `unsafe-address-balance-use` detector reporting all `addr.balance` uses

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