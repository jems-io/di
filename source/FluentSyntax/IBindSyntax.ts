import { IInsideAndToSytaxt } from "./IInsideAndToSytaxt";

/**
 * Represents a fluent syntax extension to bind aliases to the kernel.
 */
export interface IBindSyntax {
    /**
     * Creates a bind for the alias and allow fluently configure it.
     * @param alias Represents the alias to bind.
     * @return A syntax extension to associate the target or setup a container.
     */
    bind(alias:string):IInsideAndToSytaxt;
}