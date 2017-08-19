import { ResolutionContext } from '../ResolutionContext'
import { DependencyMetadata } from '../DependencyMetadata'

export default function InjectedExactlyIntoType(resolutionContext:ResolutionContext,
                                                 dependencyMetadata:DependencyMetadata, 
                                                 expectedFunction:Function):boolean {

    let aliasIndex:number = resolutionContext.targetResolutionStack.indexOf(expectedFunction);
    return aliasIndex > 0 && aliasIndex == (resolutionContext.targetResolutionStack.length - 1);
}