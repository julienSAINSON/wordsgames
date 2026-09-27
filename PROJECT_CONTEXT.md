# Project Context

## 1. Vision du projet

Atelier des mots est une application web educative pour entrainer des enfants a la lecture, puis au calcul. Elle rassemble des mini-jeux differents autour d'un moteur pedagogique commun qui privilegie l'ecoute, la memorisation et la reconstruction ordonnee.

## 2. Principes pedagogiques

- Le mot est prononce avant le jeu.
- L'enfant doit memoriser le mot.
- Le mot ne doit pas necessairement etre affiche pendant le jeu.
- L'enfant doit retrouver les lettres dans le bon ordre.
- Les erreurs fournissent un feedback sans donner directement la solution.
- Le mot complet est revele et prononce a la fin d'un exercice termine.

## 3. Architecture

- `index.html` charge l'application sans build.
- `js/main.js` compose les services et conserve l'exercice prive du mini-jeu.
- `js/core/` contient le moteur pedagogique, la session, les difficultes et les evenements.
- `data/words.json` est la source unique des mots, organisee par enfant puis serie; `js/core/word-provider.js` le charge et le valide.
- `js/data/` contient la configuration des niveaux.
- `audio/` fournit le TTS; `progression/` persiste les resultats locaux.
- `js/ui/` contient l'interface generique et le laboratoire de test.
- `js/app/` fournit le menu et le registre des mini-jeux.

## 4. Contrats entre modules

### ExerciseSession

`createExerciseSession(exercise, eventBus)` garde le mot prive. Il expose `start()`, `getState()`, `submitLetter(letter)` et `createLetterProposals(laneCount)`. Cette derniere methode retourne une liste melangee de `{ id, value }` contenant une seule reponse correcte, sans la marquer ni reveler le mot. Les resultats contiennent `correct`, `errorsRemaining`, `validatedLetters`, `completed`, `failed` et `accepted`, jamais la prochaine lettre ni le mot.

### ExerciseEngine

`createExerciseEngine({ eventBus, ttsService, progressStore })` cree une session, prononce le mot au depart ou a la demande, puis enregistre et prononce le mot en cas de reussite. `finish(exercise, result, onOutcome)` peut transmettre le mot uniquement au controleur d'application quand l'exercice est termine, jamais au mini-jeu. Seul le controleur fournit l'exercice.

### Game contract

Un mini-jeu recevra une `ExerciseSession` opaque et des callbacks de capacite, par exemple `repeatWord()` et `finish(result)`. Il implemente `mount(container, session, services)`, `start()`, `pause()` et `destroy()`. Il soumet uniquement `session.submitLetter(letter)`.

### TTS service

`createTtsService().speak(text, { language, rate, pitch, volume })` encapsule `SpeechSynthesis`. Le moteur l'utilise; les jeux n'obtiennent pas le texte du mot.

### Sound service

`createSoundService()` joue les feedbacks locaux avec Web Audio API (`playPop`, `playError`, `playSuccess`, `playRun`, `playApproach`, `playJump`) sans ressource externe. `createSpatialAudio(ttsService, announcement)` prononce periodiquement une alarme avec un volume calcule selon la distance a la base. Pour l'espace, le controleur lui fournit le mot en fermeture; le jeu n'y a jamais acces.

### Progression

`createProgressStore()` enregistre actuellement les reussites dans `localStorage`. Les statistiques par enfant et la progression adaptee sont prevues.

### Difficulty

`js/data/difficulties.js` centralise les niveaux et `getAllowedErrors(wordLength)`: 2-3 lettres = 1 erreur, 4-5 = 2 erreurs, 6 ou plus = 3 erreurs.

### WordProvider

`createWordProvider()` charge `data/words.json` via HTTP, valide sa structure et conserve le libelle complet dans `original`. Il produit aussi `normalized`, sans determinant (`le`, `la`, `les`, `un`, `une`, `l'`), pour le moteur et les lettres a retrouver. Le TTS prononce `original`, determinant inclus. Il expose `getChildren()`, `getChild(childId)`, `getSeries(childId, seriesId)`, `getWords(childId, seriesId)` et `getRandomWord(childId, seriesId)`. Le controleur cree l'exercice avec le contexte `{ childId, seriesId }`; les mini-jeux ne recoivent toujours pas le mot.

## 5. Jeux existants et jeux prevus

Le laboratoire existe uniquement pour tester le moteur. Les quatre mini-jeux sont implementes au format MVP.

### Course automobile

Vue Canvas arcade retro derriere une voiture qui avance automatiquement. Des lettres preparees par `ExerciseSession` sont reparties sur les voies; l'enfant change de voie par clavier, A/D ou toucher pour recuperer une proposition. Le jeu appelle exclusivement `session.submitLetter(value)` et affiche les lettres seulement apres validation. Niveau 1: 2 voies; niveau 2: 3; niveau 3: 4. Le mode developpeur permet de choisir les trois niveaux avec `CHAT`.

### Bulles

Un personnage Canvas souffle des bulles translucides contenant des propositions preparees par `ExerciseSession`. Les bulles montent et derivent doucement; l'enfant clique ou touche une bulle et le jeu appelle uniquement `session.submitLetter(value)`. Apres une bonne reponse, les anciennes bulles disparaissent et une nouvelle serie est generee. Les niveaux configurent 2, 3 ou 4 propositions, la vitesse, la taille et la derive des bulles.

### Course de haies

Un coureur Canvas avance automatiquement vers une haie. Dans une fenetre d'approche, les propositions opaques de `ExerciseSession` deviennent visibles et l'enfant choisit au clic/toucher ou avec 1 a 4. La proposition est soumise seulement au moment du saut. En cas d'absence de choix, le coureur ralentit, affiche "Trop tard !" et la haie recommence sans appel a `submitLetter`. Les niveaux configurent 2, 3 ou 4 propositions, la vitesse, la fenetre d'approche et la taille des lettres.

### Exploration spatiale

Un MVP Canvas place un vaisseau inertiel sur une planete plus large que l'ecran. Le joueur tourne, propulse et doit se trouver pres d'une pierre puis taper au clavier la lettre affichee pour l'accrocher; elle reste visuellement reliee au vaisseau jusqu'a son depot reel dans la base. Seul ce depot appelle `session.submitLetter(value)`. Les pierres sont regenerees par etape avec des propositions opaques, reparties alternativement a gauche et a droite de la station. La base affiche uniquement les emplacements et utilise la regle centrale d'erreurs. L'issue revele le mot au niveau du controleur, jamais dans le jeu. L'alarme periodique prononce uniquement le mot, avec un volume qui diminue selon la distance de la base.

## 6. Niveaux de difficulte

| Niveau | Mots | Intrus | Temps | Repetition | Regles de jeu |
| --- | --- | --- | --- | --- | --- |
| 1 | 2-3 lettres | 1 | sans limite | autorisee | course 2 voies; bulles 2 propositions; haies 2 propositions; espace 3 pierres, monde 1500, gravite 16, grappin 310 |
| 2 | 4-5 lettres | 2 | 10 s | autorisee | course 3 voies; bulles 3 propositions; haies 3 propositions; espace 4 pierres, monde 2200, gravite 23, grappin 96 |
| 3 | 6-12 lettres | 3 | 7 s | interdite | course 4 voies; bulles 4 propositions; haies 4 propositions; espace 5 pierres, monde 3000, gravite 31, grappin 82 |

Le plafond d'erreurs depend toujours de la longueur, pas du niveau : 1, 2 ou 3 selon la regle documentee dans `Difficulty`.

## 7. Regles qui ne doivent jamais changer sans validation

- HTML, CSS et JavaScript natif avec ES Modules.
- Aucun framework, build ou dependance externe sans validation.
- Le moteur pedagogique ne revele pas la reponse attendue aux mini-jeux.
- Les mini-jeux ne contiennent pas leur propre logique pedagogique et utilisent `ExerciseSession` pour soumettre les reponses.
- Les regles communes restent dans `js/core/`; les mecaniques et le rendu propres a un jeu restent dans son module.
- Le mot est connu du moteur et du TTS, pas du mini-jeu.
- `PROJECT_CONTEXT.md` est la source de verite avec le code. Avant toute modification importante, il faut le lire, verifier la compatibilite, demander confirmation en cas de contradiction et le mettre a jour. Aucune decision ou fonctionnalite documentee ne doit etre supprimee silencieusement.

## 8. Gestion des mots

`data/words.json` est edite manuellement et doit etre servi avec l'application par un serveur statique. Il n'existe volontairement aucune interface d'administration, backend ou seconde liste de mots dans le code.

Format minimal :

```json
{
	"children": [{ "id": "milo", "name": "Milo", "series": [{ "id": "serie-a", "title": "Série A", "words": ["CHAT"] }] }]
}
```

Pour ajouter un mot, ajouter sa chaine dans `words`, par exemple `"CHIEN"`, puis redeployer l'application. Pour creer une serie, ajouter un objet `{ "id", "title", "words" }` dans `series`. Pour ajouter un enfant, ajouter un objet `{ "id", "name", "series" }` dans `children`.

Les mots temporaires d'Irina dans `data/words.json` sont des demonstrations et devront etre remplaces par son contenu reel. Le fichier est valide au chargement : `children`, les enfants, les series et chaque mot doivent respecter la structure attendue; une erreur claire bloque le demarrage sinon.

## 9. Etat actuel du projet

Le socle est operationnel depuis un serveur statique: ecran d'accueil, selections enfant/serie, laboratoire, TTS navigateur, session opaque, regle d'erreurs centralisee, journal developpeur et persistance locale des reussites. Les quatre jeux sont jouables en Canvas aux trois niveaux de test et utilisent le WordProvider. Exploration spatiale propose pilotage, grappin, transport et depot a la base. Statistiques et profils enfants ne sont pas encore implementes.

## 10. Decisions importantes

- Le mot et la lettre attendue restent internes a `ExerciseSession`.
- Les ecrans de jeu recoivent une session opaque et des callbacks, jamais l'exercice brut.
- Le laboratoire est le harnais de test initial du moteur, pas un cinquieme mini-jeu.
- L'application doit rester utilisable hors ligne et ne charge aucune ressource externe.
- `createLetterProposals(laneCount)` est une capacite additive de session : elle fournit des choix opaques, jamais la reponse attendue.
- Les sons de feedback passent par `SoundService`; les mini-jeux ne chargent aucune ressource audio externe.
- Pour Course de haies, un retard de selection ne compte jamais comme erreur et ne soumet jamais de lettre.
- La revelation du mot en fin de mission est rendue par le controleur via `ExerciseEngine.finish`, jamais par un mini-jeu.
- `SpatialAudio` est une abstraction MVP: le volume TTS est calcule depuis la distance a la base et le mot reste encapsule dans le service cree par le controleur.
- `data/words.json` est l'unique source de verite des mots; `word-lists.js` a ete supprime.
- L'application est servie par HTTP afin de charger le JSON; aucune interface d'administration ou backend n'est volontairement ajoute.
- Le lancement d'un mini-jeu demande le plein ecran navigateur. Si le navigateur le refuse, le jeu reste jouable dans la page.

## 11. Backlog

- Faire evoluer `SpatialAudio` vers Web Audio API avec panoramique reel si necessaire.
- Ajouter listes de mots, profils enfants, statistiques et progression adaptee.
- Ajouter des tests automatises du moteur pedagogique.