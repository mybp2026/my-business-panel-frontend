/**
 * Error lanzado cuando fetch falla antes de recibir respuesta (offline,
 * backend caido, timeout). Se distingue de un 401 real: no debe cerrar
 * sesion ni redirigir a login, solo mantener el estado actual.
 */
export class NetworkError extends Error {
  public readonly isNetworkError = true;

  constructor(message: string = "Error de conexión") {
    super(message);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
