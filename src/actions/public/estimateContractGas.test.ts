/**
 * TODO:  More test cases :D
 *        - EIP-1559
 *        - Custom chain types
 *        - Custom nonce
 */

import { describe, expect, test } from 'vitest'
import {
  accounts,
  deployBAYC,
  publicClient,
  testClient,
  wagmiContractConfig,
  walletClient,
} from '../../_test'
import { baycContractConfig } from '../../_test/abis'
import { encodeFunctionData } from '../../utils'
import { mine } from '../test'
import { sendTransaction } from '../wallet'

import { deployErrorExample } from '../../_test/utils'
import { errorsExampleABI } from '../../_test/generated'
import { estimateContractGas } from './estimateContractGas'

describe('wagmi', () => {
  test('default', async () => {
    expect(
      await estimateContractGas(publicClient, {
        ...wagmiContractConfig,
        from: '0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC',
        functionName: 'mint',
        args: [69420n],
      }),
    ).toEqual(57025n)
    expect(
      await estimateContractGas(publicClient, {
        ...wagmiContractConfig,
        functionName: 'safeTransferFrom',
        from: '0x1a1E021A302C237453D3D45c7B82B19cEEB7E2e6',
        args: [
          '0x1a1E021A302C237453D3D45c7B82B19cEEB7E2e6',
          '0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC',
          1n,
        ],
      }),
    ).toEqual(49796n)
  })

  test('overloaded function', async () => {
    expect(
      await estimateContractGas(publicClient, {
        ...wagmiContractConfig,
        from: '0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC',
        functionName: 'mint',
      }),
    ).toEqual(61401n)
  })

  test('revert', async () => {
    await expect(() =>
      estimateContractGas(publicClient, {
        ...wagmiContractConfig,
        functionName: 'approve',
        args: ['0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC', 420n],
        from: accounts[0].address,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "The contract function \\"approve\\" reverted with the following reason:
      ERC721: approval to current owner

      Contract:  0x0000000000000000000000000000000000000000
      Function:  approve(address to, uint256 tokenId)
      Arguments:        (0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC, 420)
      Sender:    0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

      Docs: https://viem.sh/docs/contract/simulateContract
      Version: viem@1.0.2"
    `)
    await expect(() =>
      estimateContractGas(publicClient, {
        ...wagmiContractConfig,
        functionName: 'mint',
        args: [1n],
        from: accounts[0].address,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "The contract function \\"mint\\" reverted with the following reason:
      Token ID is taken

      Contract:  0x0000000000000000000000000000000000000000
      Function:  mint(uint256 tokenId)
      Arguments:     (1)
      Sender:    0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

      Docs: https://viem.sh/docs/contract/simulateContract
      Version: viem@1.0.2"
    `)
    await expect(() =>
      estimateContractGas(publicClient, {
        ...wagmiContractConfig,
        functionName: 'safeTransferFrom',
        from: '0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC',
        args: [
          '0x1a1E021A302C237453D3D45c7B82B19cEEB7E2e6',
          '0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC',
          1n,
        ],
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "The contract function \\"safeTransferFrom\\" reverted with the following reason:
      ERC721: transfer caller is not owner nor approved

      Contract:  0x0000000000000000000000000000000000000000
      Function:  safeTransferFrom(address from, address to, uint256 tokenId)
      Arguments:                 (0x1a1E021A302C237453D3D45c7B82B19cEEB7E2e6, 0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC, 1)
      Sender:    0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC

      Docs: https://viem.sh/docs/contract/simulateContract
      Version: viem@1.0.2"
    `)
  })
})

describe('BAYC', () => {
  describe('default', () => {
    test('mintApe', async () => {
      const { contractAddress } = await deployBAYC()

      // Set sale state to active
      // TODO: replace w/ writeContract
      await sendTransaction(walletClient, {
        data: encodeFunctionData({
          abi: baycContractConfig.abi,
          functionName: 'flipSaleState',
        }),
        from: accounts[0].address,
        to: contractAddress!,
      })
      await mine(testClient, { blocks: 1 })

      // Mint an Ape!
      expect(
        await estimateContractGas(publicClient, {
          abi: baycContractConfig.abi,
          address: contractAddress!,
          functionName: 'mintApe',
          from: accounts[0].address,
          args: [1n],
          value: 1000000000000000000n,
        }),
      ).toBe(172724n)
    })

    test('get a free $100k', async () => {
      const { contractAddress } = await deployBAYC()

      // Reserve apes
      expect(
        await estimateContractGas(publicClient, {
          abi: baycContractConfig.abi,
          address: contractAddress!,
          functionName: 'reserveApes',
          from: accounts[0].address,
        }),
      ).toBe(3607035n)
    })
  })

  describe('revert', () => {
    test('sale inactive', async () => {
      const { contractAddress } = await deployBAYC()

      // Expect mint to fail.
      await expect(() =>
        estimateContractGas(publicClient, {
          abi: baycContractConfig.abi,
          address: contractAddress!,
          functionName: 'mintApe',
          from: accounts[0].address,
          args: [1n],
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`
        "The contract function \\"mintApe\\" reverted with the following reason:
        Sale must be active to mint Ape

        Contract:  0x0000000000000000000000000000000000000000
        Function:  mintApe(uint256 numberOfTokens)
        Arguments:        (1)
        Sender:    0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

        Docs: https://viem.sh/docs/contract/simulateContract
        Version: viem@1.0.2"
      `)
    })
  })
})

describe('contract errors', () => {
  test('revert', async () => {
    const { contractAddress } = await deployErrorExample()

    await expect(() =>
      estimateContractGas(publicClient, {
        abi: errorsExampleABI,
        address: contractAddress!,
        functionName: 'revertWrite',
        from: accounts[0].address,
      }),
    ).rejects.toMatchInlineSnapshot(`
      [ContractFunctionExecutionError: The contract function "revertWrite" reverted with the following reason:
      This is a revert message

      Contract:  0x0000000000000000000000000000000000000000
      Function:  revertWrite()
      Sender:    0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

      Docs: https://viem.sh/docs/contract/simulateContract
      Version: viem@1.0.2]
    `)
  })

  test('assert', async () => {
    const { contractAddress } = await deployErrorExample()

    await expect(() =>
      estimateContractGas(publicClient, {
        abi: errorsExampleABI,
        address: contractAddress!,
        functionName: 'assertWrite',
        from: accounts[0].address,
      }),
    ).rejects.toMatchInlineSnapshot(`
      [ContractFunctionExecutionError: The contract function "assertWrite" reverted with the following reason:
      An \`assert\` condition failed.

      Contract:  0x0000000000000000000000000000000000000000
      Function:  assertWrite()
      Sender:    0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

      Docs: https://viem.sh/docs/contract/simulateContract
      Version: viem@1.0.2]
    `)
  })

  test('overflow', async () => {
    const { contractAddress } = await deployErrorExample()

    await expect(() =>
      estimateContractGas(publicClient, {
        abi: errorsExampleABI,
        address: contractAddress!,
        functionName: 'overflowWrite',
        from: accounts[0].address,
      }),
    ).rejects.toMatchInlineSnapshot(`
      [ContractFunctionExecutionError: The contract function "overflowWrite" reverted with the following reason:
      Arithmic operation resulted in underflow or overflow.

      Contract:  0x0000000000000000000000000000000000000000
      Function:  overflowWrite()
      Sender:    0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

      Docs: https://viem.sh/docs/contract/simulateContract
      Version: viem@1.0.2]
    `)
  })

  test('divide by zero', async () => {
    const { contractAddress } = await deployErrorExample()

    await expect(() =>
      estimateContractGas(publicClient, {
        abi: errorsExampleABI,
        address: contractAddress!,
        functionName: 'divideByZeroWrite',
        from: accounts[0].address,
      }),
    ).rejects.toMatchInlineSnapshot(`
      [ContractFunctionExecutionError: The contract function "divideByZeroWrite" reverted with the following reason:
      Division or modulo by zero (e.g. \`5 / 0\` or \`23 % 0\`).

      Contract:  0x0000000000000000000000000000000000000000
      Function:  divideByZeroWrite()
      Sender:    0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

      Docs: https://viem.sh/docs/contract/simulateContract
      Version: viem@1.0.2]
    `)
  })

  test('require', async () => {
    const { contractAddress } = await deployErrorExample()

    await expect(() =>
      estimateContractGas(publicClient, {
        abi: errorsExampleABI,
        address: contractAddress!,
        functionName: 'requireWrite',
        from: accounts[0].address,
      }),
    ).rejects.toMatchInlineSnapshot(`
      [ContractFunctionExecutionError: The contract function "requireWrite" reverted with the following reason:
      execution reverted

      Contract:  0x0000000000000000000000000000000000000000
      Function:  requireWrite()
      Sender:    0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

      Docs: https://viem.sh/docs/contract/simulateContract
      Version: viem@1.0.2]
    `)
  })

  test('custom error: simple', async () => {
    const { contractAddress } = await deployErrorExample()

    await expect(() =>
      estimateContractGas(publicClient, {
        abi: errorsExampleABI,
        address: contractAddress!,
        functionName: 'simpleCustomWrite',
        from: accounts[0].address,
      }),
    ).rejects.toMatchInlineSnapshot(`
      [ContractFunctionExecutionError: The contract function "simpleCustomWrite" reverted.

      Error:     SimpleError(string message)
      Arguments:            (bugger)
       
      Contract:  0x0000000000000000000000000000000000000000
      Function:  simpleCustomWrite()
      Sender:    0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

      Docs: https://viem.sh/docs/contract/simulateContract
      Version: viem@1.0.2]
    `)
  })

  test('custom error: complex', async () => {
    const { contractAddress } = await deployErrorExample()

    await expect(() =>
      estimateContractGas(publicClient, {
        abi: errorsExampleABI,
        address: contractAddress!,
        functionName: 'complexCustomWrite',
        from: accounts[0].address,
      }),
    ).rejects.toMatchInlineSnapshot(`
      [ContractFunctionExecutionError: The contract function "complexCustomWrite" reverted.

      Error:     ComplexError((address sender, uint256 bar), string message, uint256 number)
      Arguments:             ({"sender":"0x0000000000000000000000000000000000000000","bar":"69"}, bugger, 69)
       
      Contract:  0x0000000000000000000000000000000000000000
      Function:  complexCustomWrite()
      Sender:    0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

      Docs: https://viem.sh/docs/contract/simulateContract
      Version: viem@1.0.2]
    `)
  })
})