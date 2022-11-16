

### Installation of Dependencies

To install the succinctlabs dependencies, you must run `forge install succinctlabs/curve-merkle-oracle@main` (note that the tag is important here). Because there is a bug in Foundry, we then need to go to the `.gitmodules` and delete the duplicate entry and make sure the final entry looks something like this:
```
[submodule "contracts/lib/curve-merkle-oracle"]
	path = contracts/lib/curve-merkle-oracle
	url = https://github.com/succinctlabs/curve-merkle-oracle
	branch = main
```