/**
 * Zod v4 compile parfois les schémas objet en JIT via `new Function()` (voir $ZodObjectJIT).
 * Sans `script-src 'unsafe-eval'`, le navigateur bloque l’éval → violations CSP et parfois
 * `ReferenceError: can't access lexical declaration 'ed' before initialization` (noms minifiés).
 *
 * Importer ce module **en tout premier** dans chaque fichier qui instancie des schémas Zod,
 * et avant `@hookform/resolvers/zod` sur les pages client.
 */
import { config } from 'zod'

config({ jitless: true })
