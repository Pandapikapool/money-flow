/**
 * This product is single-user for v1.
 * We use an implicit user_id = "default".
 * This abstraction allows easy addition of Auth later.
 */
export function getUserId(): string {
    return "default";
}
