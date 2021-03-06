import * as assert from 'assert'

import injectedIntoAliasesValidator from '../../src/metadata-validators/injectedIntoAliasesValidator'
import { ResolutionContext } from '../../src/resolutionContext'

describe('The [InjectedIntoAliasesValidator]', function () {
  it('should return true if the reference is injected into the given alias.', function () {
    let resolutionContext: ResolutionContext = new ResolutionContext()
    resolutionContext.aliasResolutionStack = ['Alias1', 'Alias2']

    assert.ok(injectedIntoAliasesValidator(resolutionContext, null, 'Alias1'),
                 `The reference is not been injeted into the alias [Alias1]`)

    assert.ok(injectedIntoAliasesValidator(resolutionContext, null, 'Alias2'),
                 `The reference is not been injeted into the alias [Alias2]`)
  })

  it('should return false if the reference is not injected into the given alias.', function () {
    let resolutionContext: ResolutionContext = new ResolutionContext()
    resolutionContext.aliasResolutionStack = ['Alias1', 'Alias2']

    assert.ok(!injectedIntoAliasesValidator(resolutionContext, null, 'Alias3'),
                 `The reference is been injeted into the alias [Alias3]`)
  })
})
