export declare enum ERROR {
    ABORTED = "Aborted.",
    INVALID_USAGE = "This utility does not support either your terminal, or the way you're using it.",
    SIZE_LIMIT_EXCEEDED = "Size limit exceeded."
}
export declare const DEFAULTS: {
    CLOUD_HANDLER_IGNORE: string[];
    CLOUD_HANDLER_KEEP: string[];
    CLOUD_HANDLER_UNLINK: never[];
};
export declare function creativeHandler(path?: string): Promise<boolean>;
export declare function publishHandler(path?: string): Promise<boolean>;
export declare function testHandler(path?: string): Promise<boolean>;
export declare function compileHandler(path?: string): Promise<boolean>;
export declare function declarationHandler(path?: string): Promise<boolean>;
export declare function _upload_file(path: string, unlink?: boolean): Promise<string>;
declare type success = boolean;
export declare function _upload_dir(path: string, unlink?: boolean): Promise<success>;
export declare function cloudHandler(path: string | undefined, { ignore, keep, unlink, unlink_by_default, }: {
    ignore?: string[];
    keep?: string[];
    unlink?: string[];
    unlink_by_default?: boolean;
}): Promise<boolean>;
export {};
