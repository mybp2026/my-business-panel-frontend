# Guia de Contribucion

Este documento define el flujo de trabajo, estructura de ramas y reglas que todo el equipo de desarrollo debe seguir al colaborar en este repositorio.

---

## Flujo de trabajo basado en forks

1. **Cada desarrollador crea su propio fork** del repositorio original en GitHub.
2. **Los desarrolladores trabajan sobre la rama `development` de su fork**. Todos los cambios y commits se realizan en esta rama.
3. **Antes de empezar a trabajar cada dia, sincroniza tu rama `development` con el upstream** (repositorio original):

   ```bash
   git checkout development
   git pull upstream development
   ```

4. **Sube tus cambios a la rama `development` de tu fork**:

   ```bash
   git push origin development
   ```

5. **Envia un Pull Request (PR) desde la rama `development` de tu fork** comparandola con la rama `development` del repositorio original.
6. **El administrador revisa el PR y realiza el merge commit** en la rama `development` del repositorio original.

---

## Excepcion actual: `davidpaz06/my-business-panel-frontend` no es fork real

A diferencia de `my-business-panel-backend` y `my-business-panel-database`, el repo `origin` de este proyecto (`davidpaz06/my-business-panel-frontend`) **no esta conectado como fork de GitHub** de `mybp2026/my-business-panel-frontend` (confirmado via `gh repo view --json isFork` → `false`). Esto impide abrir Pull Requests cross-repo: GitHub solo permite PRs entre un fork y su repositorio padre real.

Mientras no se re-establezca la relacion de fork (`gh repo fork` o equivalente en la config del repo), el flujo autorizado es:

```bash
git push origin development
git push upstream development
```

Push directo a `upstream/development` esta autorizado explicitamente por el usuario **solo para este repositorio y solo mientras dure esta excepcion**. Una vez restablecido el fork real, este repo vuelve al flujo estandar de PR descrito arriba y esta seccion se elimina.

**No aplica a `staging` ni `master`** — esas ramas nunca reciben push directo, ni con la excepcion activa.

---

## Estructura de ramas

| Rama        | Descripcion                                                                              | Politica de cambios                                        |
| ----------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| master      | Ambiente de **produccion**. Contiene codigo estable y datos reales.                       | Solo se actualiza mediante merge desde `staging`.           |
| staging     | Ambiente de **preproduccion** o QA. Simula produccion con datos no reales.                | Solo se actualiza mediante merge desde `development`.        |
| development | Ambiente de **integracion**. Recibe los pull requests aprobados de cada desarrollador.    | Ver excepcion arriba mientras `origin` no sea fork real.     |

---

## Ejemplo de flujo completo (una vez restablecido el fork)

```bash
# 1. Crear tu fork en GitHub
# 2. Clonar tu fork
git clone git@github.com:<tu-usuario>/my-business-panel-frontend.git
cd my-business-panel-frontend

# 3. Agregar el repositorio original como upstream
git remote add upstream git@github.com:mybp2026/my-business-panel-frontend.git

# 4. Sincronizar tu rama development con upstream antes de trabajar
git checkout development
git pull upstream development

# 5. Desarrollar y hacer commits
git add .
git commit -m "feat: descripcion del cambio"
git push origin development

# 6. Crear un Pull Request desde development de tu fork hacia development del repositorio original
# 7. Esperar revision y merge por el administrador
```

---

## Reglas importantes

- **No se permite hacer push directo a las ramas `staging` o `master` del repositorio original**, bajo ninguna circunstancia.
- **Push directo a `development` solo esta permitido mientras dure la excepcion documentada arriba.**
- **Todos los cambios deben pasar por Pull Request y revision** una vez restablecido el fork real.
