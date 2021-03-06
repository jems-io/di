import { DependencyMetadata } from './dependencyMetadata'
import { Container } from './container'
import { ServicingStrategy } from './servicing-strategies/servicingStrategy'
import * as Errors from './errors/index'
import { Kernel } from './kernel'
import { ResolutionConfiguration } from './resolutionConfiguration'
import { ResolutionContext } from './resolutionContext'
import { AliasMetadata } from './aliasMetadata'
import { AliasMetadataMember } from './aliasMetadataMember'

/**
 * @private
 */
type IdentifierDependencyMetadataMap = {identifier: string, metadata: DependencyMetadata}

/**
 * @private
 */
type ResolutionConfigurationLookUpResult = {outAlias: string,configuration: ResolutionConfiguration}

/**
 * Represents a container that contain aliases metadata and is capable of resolve dependencies.
 * @private
 */
export class BuildInContainer implements Container {

  private _aliasDependenciesMetadataMap: {[dependencyAlias: string]: {[dependencyIdentifier: string]: DependencyMetadata}}
  private _metadataIdentifierAliasMap: {[metadataIdentifier: string]: string}
  private _containerContent: {[dependencyAlias: string]: any}
  private _supportContainerAliases: string[]
  private _kernel: Kernel
  private _name: string
  private _unsusedVar: any

    /**
     * Instance a new container.
     * @param {Kernel} kernel Represents the kernel that holds the container.
     * @param {string} name Reoresents the name of the container.
     */
  constructor (kernel: Kernel, name: string) {

    if (!kernel) {
      throw new Errors.InvalidDataError('To initialize a container, a kernel must be provided.')
    }

    this._kernel = kernel
    this._name = name
    this._aliasDependenciesMetadataMap = {}
    this._metadataIdentifierAliasMap = {}
  }

    /**
     * Returns the name of the container.
     * @returns {string} The name of the container.
     */
  public getName (): string { return this._name }

    /**
     * Represents the kernel that owns the container;
     */
  public getKernel (): Kernel { return this._kernel }

    /**
     * Returns the generated identifier and register the given metadata with the given alias for his future activation.
     * @param {string} alias Represents the alias.
     * @param {DependencyMetadata} dependencyMetadata Represents the dependency metadata.
     * @returns {string} Returns the dependency metadata generated identifier.
     */
  public registerDependencyMetadata (alias: string, dependencyMetadata: DependencyMetadata): string {

    this.validateReference(alias)

    if (!dependencyMetadata) {
      throw new Errors.InvalidDataError('The provided dependency metadata is invalid -> ' + dependencyMetadata)
    }

    if (!dependencyMetadata.activationReference) {
      throw new Errors.InvalidDataError('The provided dependency metadata activation reference is invalid -> ' + dependencyMetadata.activationReference)
    }

    this.validateAliasMetadata(alias, dependencyMetadata.activationReference)

    let metadataIdentifier: string = this.getDependencyMetadataIdentifier()

    if (this._metadataIdentifierAliasMap[metadataIdentifier]) {
      throw Error('The metadata identifier already exists in other alias, this identifier must be unique.')
    }

    if (!this._aliasDependenciesMetadataMap[alias]) {
      this._aliasDependenciesMetadataMap[alias] = {}
    }

    this._aliasDependenciesMetadataMap[alias][metadataIdentifier] = dependencyMetadata
    this._metadataIdentifierAliasMap[metadataIdentifier] = alias

    return metadataIdentifier
  }

    /**
     * Return the alias that contain the metadta with the given identifier.
     * @param {string} identifier Represents the identifier to look for.
     */
  public getIdentifierAlias (identifier: string): string {
    return this._metadataIdentifierAliasMap[identifier]
  }

    /**
     * Returns the registered dependencies metadata with the given alias.
     * @param {string} alias Represents the alias to look for.
     * @returns {string} Returns an array of dependencies metadata with the given alias.
     */
  public getDependenciesMetadataWithAlias (alias: string): DependencyMetadata[] {

    this.validateReference(alias)

    let toReturnDependenciesMetadata: DependencyMetadata[] = []

    this.getIdentifierMetadataMapCollection(alias).forEach(function (map) {
      toReturnDependenciesMetadata.push(map.metadata)
    })

    return toReturnDependenciesMetadata
  }

    /**
     * Returns the registered dependency metadata with the given alias and identifier.
     * @param {string} identifier Represents the identifier to look for.
     * @returns {string} Return dependency metadata with the given identifier.
     */
  public getDependencyMetadataWithIdentifier (identifier: string): DependencyMetadata {

    let alias = this._metadataIdentifierAliasMap[identifier]

    this.validateReference(alias)
    this.validateIdentifierArgument(identifier)

    let dependencyIdentifierMap = this._aliasDependenciesMetadataMap[alias]
    let toReturnDependenciesMetadata: DependencyMetadata[] = []

    if (dependencyIdentifierMap) {
      let dependencyMetadata = dependencyIdentifierMap[identifier]

      if (dependencyMetadata) {
        return dependencyMetadata
      }
    }

        // TODO: create an unregisted identifier error.
    throw new Errors.UnregisteredAliasError(`The container don't have a dependency metadata with the given alias [${alias}] and the identifier [${identifier}].`)
  }

    /**
     * Unregister all registered dependencies metadata with the given alias.
     * @param {string} alias Represents the alias to to look for.
     */
  public unregisterDependenciesMetadataWithAlias (alias: string): void {

    this.validateReference(alias)

    if (this._aliasDependenciesMetadataMap[alias]) {
      delete this._aliasDependenciesMetadataMap[alias]
    } else {
      throw new Errors.UnregisteredAliasError(`The container don't have a dependency metadata with the given alias [${alias}].`)
    }
  }

    /**
     * Unregister the dependency metadata with the given alias and identifier.
     * @param {string} identifier Represents the identifier to look for.
     */
  public unregisterDependencyMetadataWithIdentifier (identifier: string): void {

    let alias = this._metadataIdentifierAliasMap[identifier]

    this.validateReference(alias)
    this.validateIdentifierArgument(identifier)

    let dependencyIdentifierMap = this._aliasDependenciesMetadataMap[alias]
    let toReturnDependenciesMetadata: DependencyMetadata[] = []

    if (dependencyIdentifierMap) {
      delete dependencyIdentifierMap[identifier]
    } else {
            // TODO: create an unregisted identifier error.
      throw new Errors.UnregisteredAliasError(`The container don't have a dependency metadata with the given alias [${alias}] and the identifier [${identifier}].`)
    }
  }

    /**
     * Returns a boolean value specifying if the container can or not resolve an alias.
     * @param {string} alias Represents the alias to resolve.
     */
  public canResolve (alias: string): boolean {

    this.validateReference(alias)

    return !(!(this.getDependenciesMetadataWithAlias(alias)).length)
  }

    /**
     * Returns a resolved object instance asynchronous.
     * @param {{ new ():any } | Function | string} reference Represents the reference that must be resolved, it could be a class, function or alias.
     * @param {ResolutionContext} resolutionContext Represents the context of the resolution.
     */
  public resolve (reference: { new (): any } | Function | string, resolutionContext: ResolutionContext): any {

    resolutionContext.steps.push('Using container: [' + this.getName() + '] to resolve the ' + typeof reference + ': ' + (typeof reference === 'function' ? reference.name : reference))

    this.validateReference(reference)

    if (typeof reference === 'string') {
      let alias: string = reference as string
      let originalAlias: string = alias
      let resolutionConfiguration: ResolutionConfiguration = this._kernel.configuration.aliasSufixResolutionConfigurationMap['default']
      let dependenciesMetadata: DependencyMetadata[] = this.getValidAliasMetadataCollection(alias, resolutionContext)
      let activatedObjects: any[] = []

      if (!dependenciesMetadata.length) {
        let resolutionConfigurationLookUpResult: ResolutionConfigurationLookUpResult = this.getResolutionConfigurationForAlias(alias)

        if (resolutionConfigurationLookUpResult && resolutionConfigurationLookUpResult.outAlias !== alias) {

          alias = resolutionConfigurationLookUpResult.outAlias
          resolutionConfiguration = resolutionConfigurationLookUpResult.configuration
          dependenciesMetadata = this.getValidAliasMetadataCollection(alias, resolutionContext)
        }
      }

      if (!dependenciesMetadata.length) {
        if (resolutionConfiguration.optional) {
          return null
        } else {

          let supportedResolvedObject: any = this.resolveWithSupport(originalAlias, resolutionContext)

          if (supportedResolvedObject === undefined) {
            if (resolutionContext.originContainerAlias === this.getName() &&
                resolutionConfiguration.quantity === 0) {
              return activatedObjects
            }

            throw new Errors.UnregisteredAliasError(`Can not resolve the given alias [${alias}].`)
          }

          return supportedResolvedObject
        }
      } else {
        if (resolutionConfiguration.quantity > 0 && resolutionConfiguration.quantity !== dependenciesMetadata.length) {
          throw new Errors.ResolutionConfigurationError('The registered dependecy metadata quantity is not the expected in the reslution configuration.')
        }
      }

      for (let metadataIndex: number = 0; metadataIndex < dependenciesMetadata.length; metadataIndex++) {
        let dependencyMetadata: DependencyMetadata = dependenciesMetadata[metadataIndex]
        let activatedObject: any

        resolutionContext.aliasResolutionStack.push(alias)
        resolutionContext.targetResolutionStack.push(dependencyMetadata.activationReference)

        if (!dependencyMetadata.servicingStrategy) {
          dependencyMetadata.servicingStrategy = this._kernel.configuration.defaultServicingStrategy
        }

        if (resolutionContext.resolutionOption && resolutionContext.resolutionOption.beforeResolveEach) {
          resolutionContext.resolutionOption.beforeResolveEach(resolutionContext, dependencyMetadata)
        }

        if (!dependencyMetadata.deliveryStrategy) {
          dependencyMetadata.deliveryStrategy = this._kernel.configuration.defaultDeliveryStrategy
        }

        activatedObject = dependencyMetadata
                                    .deliveryStrategy
                                    .deliver(resolutionContext,
                                             dependencyMetadata)

        if (resolutionContext.resolutionOption && resolutionContext.resolutionOption.afterResolveEach) {
          resolutionContext.resolutionOption.afterResolveEach(resolutionContext, dependencyMetadata)
        }

        this.validateAliasMetadata(alias, activatedObject)

        activatedObjects.push(activatedObject)

        resolutionContext.aliasResolutionStack.splice(resolutionContext.aliasResolutionStack.length - 1, 1)
        resolutionContext.targetResolutionStack.splice(resolutionContext.targetResolutionStack.length - 1, 1)
      }

      if (resolutionContext.resolutionOption && resolutionContext.resolutionOption.afterResolve) {
        resolutionContext.resolutionOption.afterResolve(resolutionContext, activatedObjects)
      }

      return resolutionConfiguration.quantity === 1 ? activatedObjects[0] : activatedObjects
    } else {
      let temporalAlias: string = 'temporal-alias'

      this._kernel.usingContainer(this.getName()).bind(temporalAlias).to(reference)

      let activatedObject: any = this.resolve(temporalAlias, resolutionContext)

      this._kernel.usingContainer(this.getName()).unbindWithAlias(temporalAlias)

      if (resolutionContext.resolutionOption && resolutionContext.resolutionOption.afterResolve) {
        resolutionContext.resolutionOption.afterResolve(resolutionContext, activatedObject)
      }

      return activatedObject
    }
  }

    /**
     * Returns a resolved object instance asynchronous.
     * @param {{ new ():any } | Function | string} reference Represents the reference that must be resolved, it could be a class, function or alias.
     * @param {ResolutionContext} resolutionContext Represents the context of the resolution.
     * @returns {Promise<any>} A promise that resolve the objects.
     */
  public async resolveAsync (reference: { new (): any } | Function | string, resolutionContext: ResolutionContext): Promise<any> {
    return this.resolve(reference, resolutionContext)
  }

    /**
     * Set a list of container alias that will support the container resolutions.
     * @param {string[]} aliases Represents the list of container alias that support the container.
     */
  public setSupportContainersAliases (aliases: string[]): void {
    if (!aliases || (aliases && !aliases.length)) {
      throw new Errors.InvalidDataError('At least one coniner alias must be provided.')
    }

    for (let aliasIndex: number = 0; aliasIndex < aliases.length; aliasIndex++) {
      let alias: string = aliases[aliasIndex]

      if (!(this._kernel.hasContainer(alias))) {
        throw new Errors.InvalidDataError(`The given support container alias [${alias}], is not in kernel.`)
      }
    }

    this._supportContainerAliases = aliases
  }

    /**
     * Get the list of container alias that are supporting the container resolutions.
     * @return {string[]} The alises of the supports container.
     */
  public getSupportContainersAliases (): string[] {
    return this._supportContainerAliases
  }

    /**
     * Clean the list of support container alias.
     */
  public cleanSupportContainersAlias (): void {
    this._supportContainerAliases = undefined
  }

    /**
     * Dispose and release all instances in the container allowin the GC destroy it if no references are in use.
     */
  public dispose (): void {
    for (let dependencyAlias in this._aliasDependenciesMetadataMap) {
      if (this._aliasDependenciesMetadataMap.hasOwnProperty(dependencyAlias)) {
        delete this._aliasDependenciesMetadataMap[dependencyAlias]
      }
    }
  }

    /**
     * Dispose and release all instances in the container allowin the GC destroy it if no references are in use asynchronous.
     * @returns {Promise<void>} A promise that dispose the container.
     */
  public async disposeAsync (): Promise<void> {
    this.dispose()
  }

  private getDependencyMetadataIdentifier(): string {
    const id = Math.random().toString(36)
    return this._aliasDependenciesMetadataMap[id] ? this.getDependencyMetadataIdentifier() : id
  }

  private getResolutionConfigurationForAlias (alias: string): ResolutionConfigurationLookUpResult {

    let posibleSufixeMatch: string = ''

    for (let aliasSufix in this._kernel.configuration.aliasSufixResolutionConfigurationMap) {
      if (this._kernel.configuration.aliasSufixResolutionConfigurationMap.hasOwnProperty(aliasSufix) &&
                alias.endsWith(aliasSufix) &&
                alias.length > posibleSufixeMatch.length) {

        posibleSufixeMatch = aliasSufix
      }
    }

    return {
      outAlias: alias.substring(0, alias.length - posibleSufixeMatch.length),
      configuration: this._kernel.configuration.aliasSufixResolutionConfigurationMap[posibleSufixeMatch]
    }
  }

  private resolveWithSupport (alias: string, resolutionContext: ResolutionContext): any {

    if (this._supportContainerAliases) {
      for (let supportAliasIndex = 0; supportAliasIndex < this._supportContainerAliases.length; supportAliasIndex) {
        try {
          let supportAlias: string = this._supportContainerAliases[supportAliasIndex]

          resolutionContext.steps.push('Using support container: ' + supportAlias)

          resolutionContext.containerSupportingStack.push(alias)
          resolutionContext.currentContainerAlias = supportAlias

          let resolverObject: Container = this._kernel.usingContainer(supportAlias).resolveWithContext(alias, resolutionContext)

          resolutionContext.containerSupportingStack.splice(resolutionContext.containerSupportingStack.length - 1, 1)
          resolutionContext.currentContainerAlias = this._name

          return resolverObject
        } catch (error) {
          if (error instanceof Errors.UnregisteredAliasError) {
            continue
          } else {
            throw error
          }
        }
      }
    }

    return undefined
  }

  private getIdentifierMetadataMapCollection (alias: string): IdentifierDependencyMetadataMap[] {

    let dependencyIdentifierMap = this._aliasDependenciesMetadataMap[alias]
    let toReturnDependenciesMetadataMapCollection: IdentifierDependencyMetadataMap[] = []

    if (dependencyIdentifierMap) {
      for (let dependencyIdentifier in dependencyIdentifierMap) {
        if (dependencyIdentifierMap.hasOwnProperty(dependencyIdentifier)) {
          toReturnDependenciesMetadataMapCollection.push({
            identifier: dependencyIdentifier,
            metadata: dependencyIdentifierMap[dependencyIdentifier]
          })
        }
      }
    }

    return toReturnDependenciesMetadataMapCollection
  }

  private getValidAliasMetadataCollection (alias: string, resolutionContext: ResolutionContext) {
    return this.getIdentifierMetadataMapCollection(alias).filter(map => {
      return (!map.metadata.validators ||
                           (map.metadata.validators &&
                            map.metadata.validators.map(validator => {
                              return validator(resolutionContext, map.metadata)
                            }).indexOf(false) < 0)) // If contain validators, all validators must return true.
    }).map(map => map.metadata)
  }

  private existsInContent (alias: string): boolean {
    return !(!this._containerContent[alias])
  }

  private validateReference (alias: any): void {
    if (!alias) {
      throw new Errors.InvalidDataError('An alias must be provided to perform this operation.')
    }
  }

  private validateAliasMetadata (alias: any, reference: any): void {
    let aliasMetadata: AliasMetadata = this.getKernel().aliasMetadataMap[alias]

    if (!aliasMetadata) {
      return
    }

    if (!aliasMetadata.members.length) {
      return
    }

    let unfullfilledMemberPaths: string[] =
      this.getUnfullfilledMembersPathsFromMetadata(
        aliasMetadata,
        reference,
        `path <alias:${alias}>.`)

    if (unfullfilledMemberPaths.length) {
      throw new Errors.UnfulfilledMembersRequirementsError('Some of the provided references unfullfill the alias behavior', unfullfilledMemberPaths)
    }
  }

  private getUnfullfilledMembersPathsFromMetadata (aliasMetadata: AliasMetadata, reference: any, path: string): string[] {
    return [].concat(...
      aliasMetadata.members.map(member => {
        let unfullfilledMemberPaths: string[] = []

        if (!this.isMemberInReference(member.name, reference)) {
          unfullfilledMemberPaths.push(path + member.name)
        } else if (typeof reference !== 'function' && member.aliasMetadata) {
          this.getUnfullfilledMembersPathsFromMetadata(
            member.aliasMetadata,
            reference[member.name],
            path + member.name + '.'
          ).forEach(path => unfullfilledMemberPaths.push(path))
        }

        return unfullfilledMemberPaths
      })
    )
  }

  private isMemberInReference (memberName: string, reference: any): boolean {
    let prototypeReference: any

    switch (typeof reference) {
      case 'function':
        prototypeReference = (reference as Function).prototype
        break
      case 'object':
        prototypeReference = reference
        break
    }

    if (!prototypeReference) {
      return false
    }

    return prototypeReference[memberName] ?
              !!prototypeReference[memberName] :
              this.isMemberInReference(memberName, prototypeReference['__proto__'])
  }

  private validateIdentifierArgument (identifier: string): void {
    if (!identifier) {
      throw new Errors.InvalidDataError('An identifier must be provided to perform this operation.')
    }
  }
}
