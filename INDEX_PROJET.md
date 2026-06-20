\# INDEX\_PROJET.md — MuseSound

dossiers des plugins disponibles dans C:\Users\Pierre\Documents\GitHub\temp\agents\plugins

\## 🎯 Contexte du projet

Application légère monopage (HTML/JS Vanilla) avec :

\- Interface \*\*Tailwind CSS\*\* (CDN)

\- Logique modulaire ES6 (`api.js`, `player.js`, `state.js`, `ui.js`, `config.js`)

\- \*\*Résilience réseau\*\* : rotation automatique d'instances Piped/Invidious, proxy CORS

\- \*\*Sans backend persistant\*\*, sans base de données locale, sans framework



\---



\## Agents retenus



| Chemin relatif | Règle de déclenchement stricte |

| :--- | :--- |

| `application-performance/agents/frontend-developer.md` | Se déclenche pour \*\*toute amélioration de performance du lecteur ou de l'interface Tailwind\*\*. |

| `application-performance/agents/performance-engineer.md` | Se déclenche pour \*\*profiler ou optimiser le décodage audio/vidéo côté frontend\*\*. |

| `code-documentation/agents/code-reviewer.md` | Se déclenche pour \*\*toute revue de lisibilité du JS ou de la JSDoc\*\*. |

| `code-documentation/agents/docs-architect.md` | Se déclenche pour \*\*restructurer ou harmoniser la documentation projet (docs/)\*\*. |

| `code-refactoring/agents/code-reviewer.md` | Se déclenche pour \*\*identifier les duplications ou améliorations structurelles dans `/js`\*\*. |

| `code-refactoring/agents/legacy-modernizer.md` | Se déclenche pour \*\*migrer du code Vanilla vers des patterns modernes (ES2020+)\*\*. |

| `error-debugging/agents/debugger.md` | Se déclenche sur \*\*toute erreur de rotation API (CORS, timeout) ou de lecture audio\*\*. |

| `error-debugging/agents/error-detective.md` | Se déclenche pour \*\*investiguer les bugs silencieux ou les erreurs intermittentes des API externes\*\*. |

| `error-diagnostics/agents/debugger.md` | Se déclenche pour \*\*diagnostiquer les comportements anormaux du state manager ou du player\*\*. |

| `error-diagnostics/agents/error-detective.md` | Se déclenche pour \*\*traquer les erreurs asynchrones non capturées ou les Memory leaks audio\*\*. |

| `frontend-mobile-development/agents/frontend-developer.md` | Se déclenche pour \*\*toute évolution de l'UI (HTML/CSS) ou intégration Tailwind\*\*. |

| `frontend-mobile-development/agents/mobile-developer.md` | Se déclenche pour \*\*toute tâche PWA, installation Android, ou responsive mobile\*\*. |

| `frontend-mobile-security/agents/frontend-developer.md` | Se déclenche pour \*\*auditer les risques XSS ou la sécurité des entrées utilisateur (URL)\*\*. |

| `frontend-mobile-security/agents/frontend-security-coder.md` | Se déclenche pour \*\*sécuriser l'accès aux API externes ou gérer les tokens OAuth\*\*. |

| `full-stack-orchestration/agents/performance-engineer.md` | Se déclenche pour \*\*auditer la performance réseau (cascades CORS, latence proxy)\*\*. |

| `incident-response/agents/code-reviewer.md` | Se déclenche pour \*\*une revue d'urgence après un hotfix en production\*\*. |

| `incident-response/agents/debugger.md` | Se déclenche pour \*\*un débogage urgent si la rotation d'API est totalement bloquée\*\*. |

| `incident-response/agents/error-detective.md` | Se déclenche pour \*\*enquêter sur une panne silencieuse du service audio\*\*. |

| `incident-response/agents/incident-responder.md` | Se déclenche pour \*\*coordonner une réponse à un incident critique (service down)\*\*. |

| `incident-response/agents/test-automator.md` | Se déclenche pour \*\*valider un correctif d'urgence avant remise en ligne\*\*. |

| `javascript-typescript/agents/javascript-pro.md` | Se déclenche pour \*\*toute écriture, refactoring, ou revue de code dans `/js`\*\*. |

| `ui-design/agents/accessibility-expert.md` | Se déclenche pour \*\*tout audit ou amélioration de l'accessibilité (A11y) du lecteur\*\*. |

| `ui-design/agents/design-system-architect.md` | Se déclenche pour \*\*faire évoluer les jetons de design (DESIGN.md) ou les composants Tailwind\*\*. |

| `ui-design/agents/ui-designer.md` | Se déclenche pour \*\*modifier l'interface du lecteur ou créer un nouvel écran\*\*. |

| `unit-testing/agents/test-automator.md` | Se déclenche pour \*\*mettre en place ou étendre les tests unitaires (Jest/Vitest)\*\*. |

| `codebase-cleanup/agents/code-reviewer.md` | Se déclenche pour \*\*tout nettoyage de code mort, vieux logs, ou TODOs obsolètes\*\*. |



\---



\## Commands retenues



| Chemin relatif | Règle de déclenchement stricte |

| :--- | :--- |

| `application-performance/commands/performance-optimization.md` | Se déclenche pour \*\*lancer un cycle complet d'optimisation de performance frontend\*\*. |

| `code-documentation/commands/code-explain.md` | Se déclenche pour \*\*générer automatiquement une explication d'un module JS complexe\*\*. |

| `code-documentation/commands/doc-generate.md` | Se déclenche pour \*\*générer la documentation à partir de la JSDoc existante\*\*. |

| `code-refactoring/commands/refactor-clean.md` | Se déclenche pour \*\*un refactoring localisé sans ajout de fonctionnalité\*\*. |

| `error-debugging/commands/error-analysis.md` | Se déclenche sur \*\*toute erreur console remontée pendant une session de test\*\*. |

| `error-debugging/commands/error-trace.md` | Se déclenche pour \*\*reconstruire le call stack d'une exception capturée\*\*. |

| `error-diagnostics/commands/error-analysis.md` | Se déclenche pour \*\*analyser les logs d'erreurs cumulés en phase de diagnostic\*\*. |

| `error-diagnostics/commands/error-trace.md` | Se déclenche pour \*\*traquer une erreur qui se propage à travers plusieurs fichiers JS\*\*. |

| `incident-response/commands/incident-response.md` | Se déclenche pour \*\*activer le protocole de réponse à incident\*\*. |

| `incident-response/commands/smart-fix.md` | Se déclenche pour \*\*générer un correctif rapide ciblé sur l'erreur identifiée\*\*. |

| `codebase-cleanup/commands/refactor-clean.md` | Se déclenche pour \*\*un nettoyage de code automatisé ciblant les imports inutilisés et le code mort\*\*. |

| `codebase-cleanup/commands/tech-debt.md` | Se déclenche pour \*\*évaluer quantitativement la dette technique JS/Tailwind accumulée\*\*. |

| `frontend-mobile-development/commands/component-scaffold.md` | Se déclenche pour \*\*générer le boilerplate d'un nouvel écran ou composant UI\*\*. |

| `full-stack-orchestration/commands/full-stack-feature.md` | Se déclenche pour \*\*orchestrer le développement d'une fonctionnalité impliquant UI + API\*\*. |

| `git-pr-workflows/commands/pr-enhance.md` | Se déclenche pour \*\*améliorer automatiquement une PR avant merge\*\*. |



\---



\## Skills retenues



| Chemin relatif | Règle de déclenchement stricte |

| :--- | :--- |

| `developer-essentials/skills/code-review-excellence/SKILL.md` | Se déclenche pour \*\*toute revue de code qui se veut exhaustive et qualitative\*\*. |

| `developer-essentials/skills/debugging-strategies/SKILL.md` | Se déclenche pour \*\*structurer une session de debugging avancé\*\*. |

| `developer-essentials/skills/e2e-testing-patterns/SKILL.md` | Se déclenche pour \*\*mettre en place des scénarios de test end-to-end sur les flux utilisateur\*\*. |

| `developer-essentials/skills/error-handling-patterns/SKILL.md` | Se déclenche pour \*\*améliorer la robustesse de la gestion des réponses API erronées\*\*. |

| `developer-essentials/skills/git-advanced-workflows/SKILL.md` | Se déclenche pour \*\*configurer un workflow Git (feature branch, rebase) dans le repo\*\*. |

| `developer-essentials/skills/sql-optimization-patterns/SKILL.md` | ❌ \*\*NE JAMAIS DÉCLENCHER\*\* — Projet sans base de données. |

| `documentation-generation/skills/changelog-automation/SKILL.md` | Se déclenche pour \*\*générer le CHANGELOG à partir des messages de commit conventionnels\*\*. |

| `documentation-generation/skills/openapi-spec-generation/SKILL.md` | Se déclenche pour \*\*générer un contrat OpenAPI décrivant le comportement des APIs externes utilisées\*\*. |

| `framework-migration/skills/dependency-upgrade/SKILL.md` | Se déclenche pour \*\*mettre à jour les versions CDN de Tailwind ou des librairies externes\*\*. |

| `frontend-mobile-development/skills/nextjs-app-router-patterns/SKILL.md` | ❌ \*\*NE JAMAIS DÉCLENCHER\*\* — Projet sans Next.js. |

| `frontend-mobile-development/skills/react-native-architecture/SKILL.md` | ❌ \*\*NE JAMAIS DÉCLENCHER\*\* — Projet sans React Native. |

| `frontend-mobile-development/skills/react-state-management/SKILL.md` | ❌ \*\*NE JAMAIS DÉCLENCHER\*\* — Projet sans React. |

| `frontend-mobile-development/skills/tailwind-design-system/SKILL.md` | Se déclenche pour \*\*étendre ou maintenir le thème Tailwind configuré dans le projet\*\*. |

| `incident-response/skills/incident-runbook-templates/SKILL.md` | Se déclenche pour \*\*rédiger ou mettre à jour les procédures d'incident\*\*. |

| `incident-response/skills/postmortem-writing/SKILL.md` | Se déclenche pour \*\*rédiger un postmortem après une panne majeure\*\*. |

| `javascript-typescript/skills/javascript-testing-patterns/SKILL.md` | Se déclenche pour \*\*structurer la suite de tests unitaires du projet\*\*. |

| `javascript-typescript/skills/modern-javascript-patterns/SKILL.md` | Se déclenche pour \*\*appliquer des patterns modernes (async/await, optional chaining) dans la codebase\*\*. |

| `javascript-typescript/skills/nodejs-backend-patterns/SKILL.md` | ❌ \*\*NE JAMAIS DÉCLENCHER\*\* — Projet sans backend Node.js. |

| `javascript-typescript/skills/typescript-advanced-types/SKILL.md` | ❌ \*\*NE JAMAIS DÉCLENCHER\*\* — Projet en JavaScript pur. |

| `observability-monitoring/skills/grafana-dashboards/SKILL.md` | ❌ \*\*NE JAMAIS DÉCLENCHER\*\* — Pas d'infrastructure de monitoring. |

| `observability-monitoring/skills/prometheus-configuration/SKILL.md` | ❌ \*\*NE JAMAIS DÉCLENCHER\*\* — Pas d'infrastructure de monitoring. |

| `observability-monitoring/skills/slo-implementation/SKILL.md` | Se déclenche pour \*\*définir les SLOs de disponibilité de l'application (Uptime)\*\*. |

| `observability-monitoring/skills/distributed-tracing/SKILL.md` | ❌ \*\*NE JAMAIS DÉCLENCHER\*\* — Architecture monopage non distribuée. |

| `ui-design/skills/accessibility-compliance/SKILL.md` | Se déclenche pour \*\*auditer la conformité WCAG du lecteur audio\*\*. |

| `ui-design/skills/design-system-patterns/SKILL.md` | Se déclenche pour \*\*maintenir la cohérence visuelle entre les différents écrans\*\*. |

| `ui-design/skills/interaction-design/SKILL.md` | Se déclenche pour \*\*améliorer les transitions ou micro-interactions du lecteur\*\*. |

| `ui-design/skills/mobile-android-design/SKILL.md` | Se déclenche pour \*\*optimiser l'interface PWA sur Android\*\*. |

| `ui-design/skills/responsive-design/SKILL.md` | Se déclenche pour \*\*tout travail de responsive (Mobile First, breakpoints)\*\*. |

| `ui-design/skills/visual-design-foundations/SKILL.md` | Se déclenche pour \*\*appliquer ou refondre les jetons de couleur/typo/espacement\*\*. |

| `ui-design/skills/web-component-design/SKILL.md` | Se déclenche pour \*\*créer un composant Web réutilisable si le projet évolue vers du Custom Elements\*\*. |

| `codebase-cleanup/skills/...` | ❌ \*\*NE JAMAIS DÉCLENCHER\*\* — Non chargé dans l'arborescence locale du projet. |



\---



\## 🚫 Plugins explicitement exclus



\- \*\*Tous les plugins de base de données\*\* (migrations, PostgreSQL, cloud optimization, etc.) — Pas de SGBD.

\- \*\*Plugins Backend/Framework\*\* (Django, FastAPI, Next.js, .NET, Java, Go, Rust, PHP, Ruby) — Projet 100% frontend.

\- \*\*Plugins Cloud/Infrastructure\*\* (Terraform, Kubernetes, CI/CD, Service Mesh, Docker) — Pas de déploiement conteneurisé.

\- \*\*Plugins Blockchain, GameDev, Data Engineering, Machine Learning, Quant, Reverse Engineering\*\* — Hors domaine fonctionnel.

\- \*\*Plugins SEO, Marketing, RH, Légal, Ventes\*\* — Application de streaming musical, pas de site commercial.

\- \*\*Plugins JVM, Julia, Elixir, Haskell\*\* — Langages absents du projet.

\- \*\*Plugins Shell, Bash\*\* — Pas de scripts système dans le scope actuel.

\- \*\*Plugins Plugin-eval, Conductor, Ship-Mate, Agent-teams\*\* — Orchestration d'agents non pertinente pour un projet de cette taille.

\- \*\*Plugins `api-documenter` et la commande `doc-generate.md` \*\* - Sur une SPA Vanilla JS légère, maintenir une JSDoc stricte via l'IA à chaque micro-session est contre-productive. Préfère l'écriture de code auto-documenté (fonctions nommées explicitement, `state.js` limpide) plutôt que de cramer du contexte à générer des blocs de commentaires superflus.