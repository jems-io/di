import { DependencyMetadata } from "./DependencyMetadata";
import { IKernelReference } from "./IKernelReference";
import { IContainerActivator } from "./IContainerActivator";
import * as Errors from "./Errors/Index";
import { IContainer } from "./IContainer";

class ContainerActivator implements IContainerActivator {

    private _container:IContainer;
    private _activationStack:string[];

    /**
     * Instance a new container activator.
     * 
     * @class
     * @name ContainerActivator
     * @classdesc Represenst an activator that can activate objects.
     * @implements {module:jemsDI.IContainerActivator}
     * @param {module:jemsDI.IContainer} container Represents the container that will use the activator.
     * @memberof module:jemsDI
     */
    constructor(container:IContainer) {
        this._container = container;
        this._activationStack = [];        
    }

    /**
     * Return an activated instance of the given function reference.
     * 
     * @instance
     * @method activate
     * @memberof module:jemsDI.ContainerActivator
     * @param {string} alias Represenst the alias that will be ativated.
     * @param {string} functionReference Represenst the function reference to activate.
     */
    public activate(alias:string, dependencyMetadata:DependencyMetadata):any {

        this.addAliasToStack(alias);     

        var argumets = this.getFunctionArguments(dependencyMetadata.activationReference);

        let acivatedObject:any =new (Function.prototype.bind.apply(dependencyMetadata.activationReference, argumets));

        this.removeAliasFromStack(alias);

        return acivatedObject;                
    }

    /**
     * Return the result of the invokation of the given function reference.
     * 
     * @instance
     * @method invoke
     * @memberof module:jemsDI.ContainerActivator
     * @param {string} alias Represenst the alias that will be invoked.
     * @param {string} functionReference Represenst the function reference to invoke.
     */
    public invoke(alias:string, dependencyMetadata:DependencyMetadata):any {
        
        this.addAliasToStack(alias);
        
        let acivatedObject:any = dependencyMetadata.activationReference.apply(this.getFunctionArguments(dependencyMetadata.activationReference));

        this.removeAliasFromStack(alias);

        return acivatedObject;
    }

    private addAliasToStack(alias:string):void {  

        if (this._activationStack.indexOf(alias) >= 0) {
            this._activationStack.push(alias);
            throw new Errors.CyclicDependencyError('An cyclic dependency has been found for arguments in the resolution of an object.', this._activationStack);
        }

        this._activationStack.push(alias);
    }

    private removeAliasFromStack(alias:string):void {

        let aliasIndex:number = this._activationStack.indexOf(alias);
        
        this._activationStack.splice(aliasIndex, 1);
    }

    private getFunctionArguments(functionReference:any):any[] {

        let functionArguments:any[] = [null];
        let functionArgumentsNames:string[] = this.getFunctionArgumentsNames(functionReference);
        
        for(let argumentIndex = 0; argumentIndex < functionArgumentsNames.length; argumentIndex++) {

            let argumentInstance:any = this._container.resolve(functionArgumentsNames[argumentIndex], this);  
            functionArguments.push(argumentInstance);
        }

        return functionArguments;
    }

    private getFunctionArgumentsNames(functionReference:any):string[] {

        let stringObject:string = functionReference.toString();
        let stringObjectLower = stringObject.toLowerCase();
        var args:string = '';

        if (stringObjectLower.startsWith('function')) {
            args = stringObject.match(/function\s.*?\(([^)]*)\)/)[1];
        }
        else if (stringObjectLower.startsWith('class')) {

            let constructorIndex = stringObjectLower.indexOf('constructor');

            if (constructorIndex >= 0) {
                stringObject = stringObject.substr(constructorIndex);
                args = stringObject.match('constructor\\s*\\((.*?)\\)')[1];
            }
        }
 
        // Split the arguments string into an array comma delimited.
        return args.split(',').map(function(arg:string) {
            // Ensure no inline comments are parsed and trim the whitespace.
            return arg.replace(/\/\*.*\*\//, '').trim();
        }).filter(function(arg:string) {
            // Ensure no undefined values are added.
            return arg;
        })
    }
}

export { ContainerActivator as ContainerActivator };