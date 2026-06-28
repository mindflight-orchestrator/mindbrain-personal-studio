<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# La contrainte "zéro prérequis" oriente tout. Voici comment je raisonnerais.

Le principe directeur
Les participants ne doivent jamais sentir qu'ils font de l'informatique ou de la modélisation formelle. Ils doivent sentir qu'ils décrivent leur métier — et découvrir à la fin que ce qu'ils ont produit est une ontologie. Le mot arrive comme révélation, pas comme prérequis.
Ça implique que le vocabulaire de l'atelier pendant les deux premiers blocs est entièrement emprunté au langage naturel du secteur. On ne dit pas "entité", on dit "de quoi parle-t-on ?". On ne dit pas "relation", on dit "qu'est-ce qui relie ces deux choses ?".
L'approche par le récit, pas par l'abstraction
Le point de départ le plus efficace avec un groupe hétérogène n'est pas "listez vos objets métier" — c'est trop abstrait. C'est une histoire courte : "Lundi matin, Mme Dupont appelle pour signaler une fuite. Que se passe-t-il ?"
On demande aux participants de raconter ce qui se passe, dans l'ordre, librement. Le facilitateur transcrit en live sur l'interface partagée. Ce flux narratif contient naturellement :
des noms → futures entités
des verbes → futures relations
des qualificatifs → futures dimensions/facettes
des conditions → futures règles de transition
Personne n'a eu besoin de savoir ce qu'est une entité pour en produire une dizaine en 5 minutes.
Pourquoi le mindmap fonctionne ici, et ses limites
Ce qui fonctionne : Miro ou FigJam sont excellents pour cette phase narrative. Un bloc = une chose nommée, une flèche = "ça influence / ça déclenche / ça concerne". Le geste est intuitif, il n'y a rien à apprendre. La collaboration en temps réel est un avantage réel — on voit les connexions émerger collectivement, c'est visuellement satisfaisant.
La limite : le mindmap est non typé par défaut. Une flèche entre "Mme Dupont" et "Fuite" peut vouloir dire dix choses différentes. C'est acceptable en phase 1 (on capture), mais si on laisse les participants trop longtemps dans cet espace non structuré, ils produisent un graphe spaghetti qu'on ne peut pas migrer proprement vers MindBrain.
La solution : introduire les couleurs comme système de types sur Miro, sans jamais dire "type". Par exemple :
Blocs jaunes = "les choses qui existent" (futurs nœuds)
Blocs bleus = "les actions, ce qui se passe" (futurs processus)
Blocs verts = "les caractéristiques, ce qu'on sait sur une chose" (futures dimensions)
Flèches rouges = "l'un déclenche l'autre"
Flèches grises = "l'un appartient à l'autre"
Ce codage couleur est le système de types — les participants l'apprennent sans s'en rendre compte. À la fin du Bloc 1, quand le facilitateur dit "ce que vous avez appelé blocs jaunes, en modélisation on appelle ça des entités", la connexion est immédiate parce qu'elle s'appuie sur quelque chose qu'ils ont déjà produit.
Le moment charnière : passer du mindmap au canvas structuré
C'est la transition la plus délicate. Entre le mindmap libre (Bloc 1) et l'ontologie formelle (Bloc 4), il faut une étape intermédiaire. Je proposerais un canvas semi-structuré — pas un mindmap, pas encore un schéma formel.
Concrètement : une grille simple avec 4 colonnes sur Miro ou Mural —
Qui / QuoiSait quoi sur luiEst relié àPeut faire / subir
Copropriétaire
nom, lot, tantièmes
Immeuble, Bail
Signaler, Voter
Sinistre
type, date, localisation
PartieCommune, Police
Déclencher, Être clos
Les participants remplissent leur tableau avec leurs mots. Le facilitateur ne normalise pas les noms à ce stade. Cette grille est déjà une ontologie — mais ça ne se dit pas encore.
Canva vs Miro : le bon outil selon le contexte
Miro est le bon choix pour cet atelier. Sticky notes, blocs colorés, flèches, templates collaboratifs en temps réel, breakout rooms compatibles — c'est fait pour ça. La courbe d'apprentissage pour un participant occasionnel est quasi nulle (déplacer un bloc, tracer une flèche).
Canva est inadapté : c'est un outil de publication, pas de pensée collaborative. On ne modélise pas sur Canva, on présente ce qu'on a modélisé ailleurs. Il pourrait servir à produire le livrable final (le canvas onto_ mis en forme), mais pas pendant l'atelier.
FigJam (Figma) est une alternative crédible à Miro, légèrement plus propre visuellement, mais moins répandu en entreprise non-design.
Ce que le jeu de cartes apporte que Miro ne suffit pas à faire
Le mindmap sur Miro capture bien les entités et les relations. Mais il capture mal les facettes (les dimensions d'interrogation, la façon dont on va requêter les données plus tard) — parce que ce concept n'a pas d'équivalent naturel dans le langage courant.
C'est là que le jeu de cartes physique (ou numérique) a sa vraie valeur ajoutée : les cartes "Dimension" et "Facette" forcent la question "comment allez-vous retrouver cette information ?", que personne ne pose spontanément. Un participant qui tient en main une carte "Facette temporelle" est obligé de réfléchir à quand — et c'est souvent là que les insights métier les plus intéressants émergent ("on n'a jamais su retrouver les sinistres par saison alors que c'est critique pour notre prestataire couvreur").
Le jeu de cartes n'est donc pas un substitut au mindmap — c'est son complément structurant, introduit précisément au moment où le mindmap libre a atteint sa limite naturelle.

Task: on développe un jeu de carte (post-it) pour créer des ontologies métiers. Ici le cadre de départ est une agence de syndic (gestion immobilière de parc immobilier).  Comment amorcer le scénario pour faire parler les équipes sur la modélisation avec les noms, les verbes, les qualifications, les conditons, les modes de recherches, ...  ? La demande du client sera de passer à un exercice pratique sur les extraits banquaires CODA (compte banquaire professionnels en Belgique) et pouvoir définir progressivement les ontologies annexes pour connecter les ensembles / domaines connexes et leurs relations.

La recherche web n'est pas utile ici — c'est une question de design d'atelier sur mesure. Je réponds directement.

***

## Scénario d'amorce : "Lundi matin au syndic"

Le scénario d'entrée doit être ancré dans une situation concrète et légèrement stressante — c'est ce qui génère le vocabulaire riche. Pour un syndic, la tension naturelle, c'est l'urgence financière et l'arbitrage entre plusieurs parties.

**Le scénario proposé :**

> *"C'est le 5 du mois. Marie, comptable chez le syndic, ouvre son relevé CODA du matin. Elle voit un virement de 1 847,23 € avec la communication 'CP LOT 12 CHGE JANV'. Elle doit savoir : qui a payé, pour quel immeuble, si c'est complet ou partiel, si ce copropriétaire a un arriéré, et si oui, envoyer une quittance ou une relance."*

En 90 secondes, ce scénario force les participants à produire : un acteur (Marie, copropriétaire), des objets (relevé, virement, lot, immeuble, quittance, relance), des états (complet/partiel, à jour/arriéré), des conditions (si complet → quittance, si arriéré → relance), et un mode de recherche (retrouver par numéro de lot, par mois, par immeuble).

***

## Structure du jeu de cartes — domaine syndic/CODA

### Acte 1 — Nommer les choses (cartes Noms, jaunes)

Chaque carte posée répond à : *"De quoi parle-t-on dans ce scénario ?"*

Cartes de départ suggérées (à écrire sur post-it jaunes physiques ou blocs Miro) :

- **Copropriétaire** — nom, lot(s), tantièmes, email, IBAN
- **Immeuble** — référence, adresse, nombre de lots
- **Lot** — numéro, type (cave, appartement, parking), surface
- **Écriture CODA** — montant, date valeur, communication structurée, BIC/IBAN
- **Appel de charges** — mois, montant prévu, répartition par lot
- **Quittance** — date, montant acquitté, période couverte
- **Relance** — niveau (1/2/3), date, montant dû, frais


### Acte 2 — Relier (cartes Verbes, rouges)

*"Qu'est-ce qui se passe entre ces deux choses ?"*

- Écriture CODA **est rapprochée de** → Appel de charges
- Copropriétaire **génère** → Écriture CODA
- Appel de charges **couvre** → Lot
- Écriture CODA **déclenche** → Quittance ou Relance
- Syndic **impute** → Écriture CODA à un Lot

> À ce stade, le facilitateur note au tableau les verbes qui reviennent : *rapprocher, imputer, lettrer, ventiler* — ce sont des verbes métier comptables qui deviendront des transitions d'état dans MindBrain.

### Acte 3 — Qualifier (cartes Dimensions, vertes)

*"Comment décrit-on l'état de cette chose ? Comment sait-on que c'est réglé ?"*

- Écriture CODA : `statut` (brute / rapprochée / rejetée), `canal` (virement / prélèvement / espèces), `communication_structurée` (oui/non)
- Appel de charges : `statut_paiement` (attendu / partiel / soldé / en retard), `exercice`, `trimestre`
- Copropriétaire : `statut_comptable` (à jour / débiteur / en contentieux), `langue` (fr/nl/de — pertinent en Belgique)


### Acte 4 — Conditionner (cartes Règles, orange)

*"Dans quelles conditions ça change ?"*

C'est la carte la plus puissante pour faire émerger les règles métier implicites :


| Condition | Déclenchement |
| :-- | :-- |
| Écriture CODA rapprochée ET montant = appel | → Quittance générée |
| Écriture CODA rapprochée ET montant < appel | → Paiement partiel, relance niveau 1 |
| Appel non soldé après J+15 | → Relance niveau 2 |
| Communication structurée absente | → File d'attente identification manuelle |

Ces cartes font souvent émerger des cas bord que personne n'avait documentés : *"Et si le virement arrive avec la mauvaise communication mais que le montant matche exactement ?"* — c'est exactement le type d'insight qu'on veut capturer.

### Acte 5 — Interroger (cartes Facettes, bleues)

*"Comment allez-vous retrouver cette information dans 6 mois ?"*

C'est le pont direct vers `pg_facets`. Les questions à poser pour chaque entité :

- **Par qui ?** → facette `copropriétaire_id`, `gestionnaire`
- **Par quand ?** → facette `mois`, `exercice`, `date_valeur`
- **Par où ?** → facette `immeuble`, `lot`
- **Par état ?** → facette `statut_paiement`, `statut_relance`
- **Par combien ?** → facette `tranche_montant` (utile pour détecter les micro-paiements ou les gros arriérés)

***

## Montée en puissance : connecter les domaines annexes

Une fois le domaine CODA posé, le facilitateur introduit les **cartes de connexion** (grises) :

*"Quelles autres choses dans votre travail sont liées à ce que vous venez de modéliser ?"*

Les domaines connexes qui émergent naturellement dans un syndic :

- **AG (Assemblée Générale)** — votes, résolutions, budget prévisionnel → relie à `Appel de charges`
- **Sinistres \& assurances** — déclaration, expertise, remboursement → relie à `PartieCommune`, `Lot`
- **Prestataires \& contrats** — factures, bons de commande → relie à `Écriture CODA` (côté dépense)
- **Locataires** → relie à `Lot`, distincts des copropriétaires

Chaque domaine connexe devient une nouvelle session de cartes, en réutilisant les entités déjà posées comme ancres. C'est le mécanisme d'extension progressive de l'ontologie — les participants voient physiquement les post-its se connecter d'une session à l'autre.

***

## Séquence complète de l'atelier

1. **Scénario CODA** (20 min) — narration libre, post-its spontanés
2. **Tri par couleur** (10 min) — classer ce qui a été produit en Noms / Verbes / Qualificatifs
3. **Canvas semi-structuré** (20 min) — grille Qui/Sait quoi/Relié à/Peut faire
4. **Cartes Règles** (15 min) — formaliser les conditions implicites
5. **Cartes Facettes** (15 min) — "comment retrouvez-vous ça ?"
6. **Révélation** (5 min) — "ce que vous avez produit s'appelle une ontologie"
7. **Extension** (30 min) — connecter un domaine annexe (AG ou Sinistres) avec les mêmes cartes

Le mot *ontologie* n'apparaît qu'en étape 6. Avant ça, les participants ont simplement décrit leur métier.
<span style="display:none">[^1_1][^1_10][^1_2][^1_3][^1_4][^1_5][^1_6][^1_7][^1_8][^1_9]</span>

<div align="center">⁂</div>

[^1_1]: https://theses.hal.science/tel-04758606/file/StephanouSalhas.pdf

[^1_2]: https://laurentbloch.net/MySpip3/IMG/pdf/siprojets-2024-08-24.pdf

[^1_3]: http://contraintes.inria.fr/~fages/Papers/contraintes.pdf

[^1_4]: https://theses.fr/api/v1/document/2010ARTO0411

[^1_5]: https://pedagogie.centralelille.fr/guides/GuidesEnseignants/2022/Syllabus/co/RedigerSyllabus_05_Prerequis.html

[^1_6]: https://hal.science/tel-04631290v2/file/hdrPA-v2-0.pdf

[^1_7]: https://unidistance.ch/ressources-edudl/article-edudl/entre-prerequis-et-preacquis-comment-rester-dans-la-cible

[^1_8]: https://publications.polymtl.ca/123/1/2009_HindRakkay.pdf

[^1_9]: https://citeseerx.ist.psu.edu/document?repid=rep1\&type=pdf\&doi=d644b1bd9ad29adc5f08eea171422f40ae9a7e01

[^1_10]: https://core.ac.uk/download/pdf/78383447.pdf


---

# Les 5 actes si je devais les définir sur un tableau façon SWOT comment donner une courte définition à chaque poste : NOMS, VERBES, ....

Voici un tableau façon SWOT adapté aux 5 actes — chaque case répond à la question *"À quoi ça sert dans la modélisation ?"*

## Les 5 actes en tableau de référence

| Acte | Mot clé facilitateur | Définition courte | Couleur |
| :-- | :-- | :-- | :-- |
| **Noms** | *"De quoi parle-t-on ?"* | Les choses qui existent dans le métier et qu'on peut nommer, compter, stocker | 🟡 Jaune |
| **Verbes** | *"Qu'est-ce qui se passe ?"* | Les actions, événements et flux qui relient deux choses entre elles | 🔴 Rouge |
| **Qualificatifs** | *"Comment le décrit-on ?"* | Les caractéristiques qui décrivent l'état ou les propriétés d'une chose à un instant donné | 🟢 Vert |
| **Conditions** | *"Dans quelles circonstances ça change ?"* | Les règles implicites du métier qui déclenchent une action ou un changement d'état | 🟠 Orange |
| **Modes de recherche** | *"Comment le retrouve-t-on ?"* | Les angles par lesquels on interroge la donnée — par qui, quand, où, quel état, quel montant | 🔵 Bleu |


***

La logique de progression est volontaire : les **Noms** sans **Verbes** sont une liste morte. Les **Verbes** sans **Qualificatifs** ignorent les états. Les **Qualificatifs** sans **Conditions** ne savent pas quand ils changent. Et tout ça sans **Modes de recherche** reste inexploitable en pratique.

Chaque acte est donc inutile seul — c'est leur articulation qui produit une ontologie opérationnelle.

---

## Objectifs des 5 actes de modélisation

| Acte | Objectif |
| :-- | :-- |
| **Noms** | Nommer tous les objets du métier pour poser les fondations du modèle |
| **Verbes** | Identifier toutes les interactions et flux à modéliser |
| **Qualificatifs** | Repérer les dimensions qui distinguent un état normal d'une anomalie |
| **Conditions** | Anticiper les règles implicites qui gouvernent les transitions et les exceptions |
| **Modes de recherche** | Définir les axes d'interrogation pour rendre le modèle exploitable en pratique |


---

# voilà une représentation visuelle. comment nommerais-tu les déplacements entre les différentes zones de la grille ... (le petits traits tillés en gris (le bon, le moins bon, ce que nous savons, ... qui étaient lié à l'analyse SWOT)

Sur le canvas, les axes en pointillés délimitent les quadrants comme dans un SWOT classique. Ces lignes de séparation portent traditionnellement des noms qui qualifient le passage d'une zone à l'autre — ce sont des **axes de tension**.

## Nommer les axes du canvas

Voici comment nommer les 4 axes de déplacement entre zones, en restant dans le registre de l'atelier :


| Axe | Entre quelles zones | Nom proposé |
| :-- | :-- | :-- |
| **Horizontal haut** | Noms ↔ Verbes | *"Ce qui existe → Ce qui se passe"* — l'axe **d'activation** |
| **Vertical gauche** | Noms ↔ Qualificatifs | *"Ce qu'on nomme → Ce qu'on décrit"* — l'axe **de précision** |
| **Vertical droit** | Verbes ↔ Conditions | *"Ce qui se passe → Ce qui le gouverne"* — l'axe **de contrôle** |
| **Horizontal bas** | Qualificatifs ↔ Conditions | *"Ce qu'on sait → Ce qui peut changer"* — l'axe **de transition** |

Et la **Recherche** (coin haut droit isolé) n'est pas dans la grille principale — elle se positionne naturellement comme l'axe **de sortie** : *"Ce modèle, comment l'interroge-t-on ?"*

***

## Emprunt au SWOT

Si tu veux coller au vocabulaire SWOT pour que les participants retrouvent leurs repères :

- Axe horizontal = **le bon / le moins bon** → ce qui fonctionne (Noms, Verbes clairs) vs ce qui est flou (Conditions non formalisées)
- Axe vertical = **ce que nous savons / ce que nous ignorons** → données maîtrisées (Qualificatifs documentés) vs règles implicites (Conditions non dites)

Le croisement des deux axes produit exactement la même logique que le SWOT : *ce qu'on sait et qui fonctionne* (en haut à gauche) jusqu'à *ce qu'on ignore et qui peut mal tourner* (en bas à droite — les Conditions non anticipées).
<span style="display:none">[^4_1]</span>

<div align="center">⁂</div>

[^4_1]: image.jpg


---

## Scénario : panne d'ascenseur en copropriété


***

### Noms — *"De quoi parle-t-on ?"*

Les choses qui existent dans ce scénario :

- **Copropriétaire** — celui qui appelle
- **Immeuble** — le bâtiment concerné
- **Ascenseur** — l'équipement en panne
- **Panne** — l'événement déclaré
- **Technicien** — le prestataire à mobiliser
- **Contrat de maintenance** — lien entre immeuble et prestataire
- **Bon d'intervention** — document généré
- **Gestionnaire** — la personne au syndic qui traite

***

### Verbes — *"Qu'est-ce qui se passe ?"*

Les actions et flux qui relient ces choses :

- Copropriétaire **signale** → Panne
- Gestionnaire **identifie** → Immeuble concerné
- Gestionnaire **consulte** → Contrat de maintenance
- Syndic **mandate** → Technicien
- Technicien **intervient sur** → Ascenseur
- Intervention **génère** → Bon d'intervention
- Bon d'intervention **est imputé à** → Budget immeuble

***

### Qualificatifs — *"Comment le décrit-on ?"*

Les dimensions qui caractérisent l'état de chaque chose :

- **Panne** : type (mécanique / électrique / blocage cabine), gravité (bloquant / dégradé), personnes coincées (oui / non)
- **Ascenseur** : âge, dernière date de contrôle réglementaire, statut (en service / hors service / en attente)
- **Contrat de maintenance** : couverture (préventive / curative / totale), délai d'intervention contractuel (2h / 4h / 24h)
- **Intervention** : statut (demandée / planifiée / en cours / clôturée), coût estimé, coût réel

***

### Conditions — *"Dans quelles circonstances ça change ?"*

| Condition | Déclenchement |
| :-- | :-- |
| Personne coincée dans la cabine | → Appel pompiers en priorité, procédure urgence |
| Contrat maintenance actif ET délai < 4h | → Mandat direct technicien contractuel |
| Pas de contrat OU contrat expiré | → Consultation devis, validation conseil syndical si > seuil |
| Coût intervention > seuil budgétaire | → Convocation AG ou accord copropriétaires |
| Panne récurrente (>2 en 6 mois) | → Déclenchement diagnostic complet, alerte vétusté |


***

### Modes de recherche — *"Comment le retrouve-t-on ?"*

Les facettes qui rendront ce modèle interrogeable :

- **Par qui ?** → copropriétaire déclarant, gestionnaire traitant
- **Par quand ?** → date déclaration, date intervention, mois, exercice
- **Par où ?** → immeuble, adresse, numéro d'équipement
- **Par état ?** → statut panne, statut intervention
- **Par combien ?** → tranche de coût, dépassement budgétaire
- **Par contrat ?** → prestataire, type de couverture, délai contractuel

***

La progression est identique à celle du scénario CODA — mais ici les **Conditions** font émerger des règles que le syndic applique souvent de mémoire sans les avoir jamais écrites : le seuil de validation, la procédure urgence, le critère de récurrence. C'est exactement ce que le jeu de cartes doit forcer à la surface.

---

# QUALIFICATIFS et RECHERCHE n'ont pas été développé durant l'atelier.

1/ OCR les premieres vues
2/ PROPOSE une complétion des 2 BLOCS manquants pour compléter sur base des éléments listés dans les premiers blocs

Voici d'abord l'OCR consolidé des 3 blocs produits en atelier, puis la complétion des 2 blocs manquants.

***

## OCR — Blocs produits en atelier

### NOMS[^6_1]

**Copropriété** : référence, adresse, nombre de lots, statuts
**Partie commune générale** : Équipements
**Partie commune particulière** : bloc A, bloc B
**Équipements** : chaudière, ascenseur, ventilation, portes, barrières, adoucisseur d'eau, caméra, parlophone
**Copropriété partie privative (lots)** : appartements, caves, parkings
**Contrats** : condition d'engagement dans un délai (24h/48h), pièces de réparation comprise ou pas, \# de téléphone à contacter pour le dépannage
**Fournisseurs** : contrats coutume/tacite/convention orale, Technicien
**Sinistre** : ex. ascenseur tombé en panne à cause d'une fuite d'eau
**Contrat d'assurance** : introduction d'une demande pour la couverture du sinistre
**Occupants** : lots, propriétaires, locataires, occupant, bailleur
**Propriétaires** : occupant, bailleur
**TeamLeader ticket** : description de l'issue, description du temps passé, encodage du temps passé par collaborateur, facture finale (timesheet)
**Équipe de gestion** : responsable pour gérer l'incident
**Contact**
**Assemblées générales**
**Conseil de copropriété**
**Commissaire aux comptes**
**Discussions dans Front** (une discussion thread email = un ticket)
**Expérience Client** : équipe de gestion, contrat, établis la facture de la prestation
**Infrastructure (ITEROP BPML)** : AG, Appels à fond, ...
**Portefeuille** : liste d'immeuble associé à une équipe de gestion
**Services Infrastructure** : comptable, décisionnelle, administrative, ...
**Transversal à tous les immeubles**
**Ticket support**
**Source de l'issue** : téléphone, email, sms
**Incident** : lieu, communiqué par et quand, situation
**Intervention** : technicien
**Liste des personnes qui ont appelé**
**Devis**
**Bon de commande**
**Rapport d'intervention / bon d'intervention**
**Facture**

***

### VERBES[^6_2]

- Copropriétaire/occupant → **SIGNALE** → un incident
- Gestion → **IDENTIFIE** → l'immeuble
- Gestion → **IDENTIFIE** → équipement
- Gestion → **DEMANDE** une intervention → Fournisseur
- Le technicien → **INTERVIENT** → Panne
- La gestion → **QUALIFIE** le signalement en incident
- Le technicien → **COMMUNIQUE** → rapport d'intervention
- Le rapport d'intervention → **INFORME** → la gestion
- Le fournisseur → **FACTURE** sa prestation à la copropriété suivant contrat
- Le Syndic → **FACTURE** sa prestation à la copropriété suivant contrat
- L'infrastructure comptable → **COMPTABILISE** les factures
- Le syndic/conseil de copro/assemblée générale → **VALIDE/REFUSE** → Devis/bdc/bdl/facture
- Gestionnaire → **CONSULTE** → le contrat du fournisseur
- L'interlocuteur qui appelle → **HABITE** → un bloc A, B ou C de l'immeuble
- Le gestionnaire → **MANDATE** → le fournisseur (par un email)
- La gestion → **INFORME/CLÔTURE** → l'incident
- Équipe de gestion → **GÈRE** des copropriétés / un portefeuille
- Syndic → **REPRÉSENTE** → la copropriété
- Le syndic/conseil de copro/assemblée générale → **VALIDE/CONTESTE** la facture du fournisseur
- Groupe de locataires → **LOUE** → un lot (location : montant du loyer, date de début, date de fin = locataire)
- Contact → **OCCUPE** → un lot (location : montant du loyer, date de début, date de fin = occupant)
- Contact → **REPRÉSENTE** → un lot = mandataire
- Contact → ... → Groupe de propriétaires
- Groupe de propriétaires → **POSSÈDE** → un lot (propriété : % de possession + type de droit — usufruitier, nu-propriétaire, plein propriétaire — date de début, date de fin = Propriétaire)

***

### CONDITIONS[^6_3]

Changement de propriétaire / Changement de locataire / Début·rupture·fin de contrat d'un fournisseur / Modification législative / Décisions d'assemblées générales (AG) / Décisions du Conseil de copropriété / Signalement / Appel de fonds / Décomptes / Convocation / Soumission d'un point à l'ordre du jour / Soumission d'une note de frais / Réception d'un devis / bdc / bdl / facture / Échanges juridiques / Sinistre

***

## Complétion proposée — QUALIFICATIFS

*"Comment le décrit-on ?"* — Les caractéristiques qui décrivent l'état ou les propriétés d'une chose à un instant donné.


| Nom | Qualificatifs à renseigner |
| :-- | :-- |
| **Incident** | statut (ouvert / en cours / clôturé / sans suite), gravité (urgent / normal / faible), canal de réception (téléphone / email / sms), date de signalement, délai de traitement |
| **Équipement** | type, localisation (partie commune générale / bloc / lot), statut (opérationnel / hors service / en maintenance), date dernière révision, couvert par contrat (oui/non) |
| **Contrat fournisseur** | type (curatif / préventif / total), statut (actif / expiré / résilié), délai d'intervention contractuel (2h / 4h / 24h / 48h), pièces incluses (oui/non), date début, date fin |
| **Intervention** | statut (demandée / planifiée / en cours / clôturée), type (dépannage / réparation / remplacement), coût estimé, coût réel, conforme devis (oui/non) |
| **Devis / BDC / BDL / Facture** | référence, date d'émission, date d'échéance, montant HT/TVA/TTC, fournisseur, statut (en attente / validé / refusé / contesté / payé) |
| **Lot** | type (appartement / cave / parking), surface, étage, bloc, statut occupation (occupé / vacant / en travaux) |
| **Copropriété** | nombre de lots, statut syndic (actif / en liquidation), langue de gestion (fr/nl/de), gestionnaire responsable |
| **Ticket support** | priorité (haute / normale / basse), source (téléphone / email / sms), temps passé total, facturé (oui/non) |
| **Sinistre** | type (dégât des eaux / incendie / vandalisme / ...), statut déclaration assurance (non déclaré / en cours / remboursé / refusé), montant estimé |


***

## Complétion proposée — RECHERCHE

*"Comment le retrouve-t-on ?"* — Les facettes d'interrogation construites à partir des Noms, Verbes et Conditions produits.


| Axe | Facettes concrètes |
| :-- | :-- |
| **Par qui ?** | copropriétaire, locataire, gestionnaire, fournisseur, technicien, mandataire |
| **Par quand ?** | date de signalement, date d'intervention, mois, exercice comptable, date d'échéance contrat |
| **Par où ?** | immeuble (référence), bloc (A/B/C), lot (numéro), partie commune, équipement |
| **Par état ?** | statut incident, statut intervention, statut contrat, statut facture, statut occupation du lot |
| **Par combien ?** | tranche de coût (devis / facture), montant arriéré, dépassement budgétaire, temps passé (timesheet) |
| **Par type ?** | type d'équipement, type d'incident, type de contrat, type de droit de propriété, source du signalement |
| **Par condition déclenchante ?** | sinistre, changement de propriétaire, décision AG, appel de fonds — pour retrouver tous les événements liés à un déclencheur donné |


***

Le bloc **RECHERCHE** est le seul qui croise tous les autres — chaque facette est la projection d'un Qualificatif sur un axe d'interrogation. C'est ce qui permet à MindBrain de savoir quels index construire et quelles dimensions exposer dans `pg_facets`.
<span style="display:none">[^6_4][^6_5]</span>

<div align="center">⁂</div>

[^6_1]: image-5.jpg

[^6_2]: image-4.jpg

[^6_3]: image-3.jpg

[^6_4]: image.jpg

[^6_5]: image-2.jpg


---

# sur base de la liste des noms => quels sont les "verbes" manquants ou qui pourraient compléter la liste ?

La recherche web n'est pas pertinente ici. Je travaille directement depuis les Noms et Verbes extraits des images.

***

## Verbes manquants — par zone non couverte

L'analyse croise la liste des **Noms** avec les **Verbes** déjà produits. Voici ce qui n'est pas encore relié.

### Autour du cycle documentaire (Devis → BDC → BDL → Facture)

Les verbes produits couvrent VALIDE/REFUSE et COMPTABILISE, mais pas le flux interne :

- Gestionnaire → **CRÉE** → un Devis / Bon de commande
- Fournisseur → **ÉMET** → un Bon de livraison / une Facture
- Gestionnaire → **RAPPROCHE** → Bon de livraison avec Bon de commande
- Infrastructure comptable → **IMPUTE** → Facture à un immeuble / lot
- Infrastructure comptable → **LETTRAGE** → Facture avec paiement


### Autour du Ticket support / TeamLeader

- Contact → **OUVRE** → un Ticket support
- Gestionnaire → **ASSIGNE** → Ticket à un collaborateur
- Collaborateur → **ENCODE** → temps passé sur un Ticket
- TeamLeader → **CLÔTURE** / **FACTURE** → Ticket (timesheet → facture client)
- Système → **ESCALADE** → Ticket (si délai dépassé)


### Autour des Assemblées Générales et du Conseil de copropriété

- Syndic → **CONVOQUE** → Assemblée Générale / Conseil de copropriété
- Copropriétaire → **VOTE** → une résolution
- AG → **APPROUVE** / **REJETTE** → le budget prévisionnel
- AG → **DONNE MANDAT** → au syndic
- Syndic → **RÉDIGE** → le procès-verbal d'AG


### Autour des Appels de fonds et décomptes

- Syndic → **CALCULE** → l'appel de fonds par tantièmes
- Syndic → **ÉMET** → l'appel de fonds vers chaque copropriétaire
- Copropriétaire → **PAIE** → l'appel de fonds
- Syndic → **ÉTABLIT** → le décompte annuel par lot
- Syndic → **REMBOURSE** / **RÉCLAME** → le solde après décompte


### Autour du Sinistre et de l'Assurance

- Gestionnaire → **DÉCLARE** → le Sinistre à l'assureur
- Assureur → **MANDATE** → un expert
- Expert → **ÉVALUE** → le montant du sinistre
- Assureur → **INDEMNISE** / **REFUSE** → la copropriété
- Gestionnaire → **SUIT** → le dossier sinistre


### Autour du Portefeuille et de l'équipe de gestion

- Direction → **ATTRIBUE** → un Portefeuille à une équipe de gestion
- Gestionnaire → **TRANSFERT** → un immeuble à un autre gestionnaire
- Système → **ALERTE** → le gestionnaire (échéance contrat, dépassement budget)


### Autour des Occupants / Locataires

- Propriétaire → **MET EN LOCATION** → un Lot
- Locataire → **RÉSILIE** → un bail
- Syndic → **NOTIFIE** → un changement de propriétaire aux copropriétaires

***

## Récapitulatif des zones encore blanches

| Zone | Verbes manquants clés |
| :-- | :-- |
| Cycle documentaire | CRÉE, ÉMET, RAPPROCHE, IMPUTE, LETTRE |
| Ticket / Timesheet | OUVRE, ASSIGNE, ENCODE, ESCALADE |
| AG / Conseil | CONVOQUE, VOTE, APPROUVE, RÉDIGE |
| Appels de fonds | CALCULE, ÉMET, PAIE, ÉTABLIT, REMBOURSE |
| Sinistre | DÉCLARE, ÉVALUE, INDEMNISE |
| Portefeuille | ATTRIBUE, TRANSFERT, ALERTE |
| Occupation | MET EN LOCATION, RÉSILIE, NOTIFIE |

Les verbes **RAPPROCHE**, **LETTRE** et **ESCALADE** sont les plus structurants pour MindBrain — ce sont des transitions d'état non triviales qui impliquent une règle métier, pas juste une action simple.
<span style="display:none">[^7_1][^7_10][^7_2][^7_3][^7_4][^7_5][^7_6][^7_7][^7_8][^7_9]</span>

<div align="center">⁂</div>

[^7_1]: https://leconjugueur.lefigaro.fr/frlistedeverbe.php

[^7_2]: https://www.youtube.com/watch?v=y1nEDa7xdIE

[^7_3]: https://fr.scribd.com/document/947074991/French-Verbs-Tables-10-11-13

[^7_4]: https://www.ortholud.com/exercices_de_grammaire_2.html

[^7_5]: https://fr.scribd.com/document/536665094/liste-de-verbes-francais-avec-leurs-noms

[^7_6]: https://ru.scribd.com/document/536665094/liste-de-verbes-francais-avec-leurs-noms

[^7_7]: https://francais.lingolia.com/fr/50-verbes-francais

[^7_8]: https://de.scribd.com/document/536665094/liste-de-verbes-francais-avec-leurs-noms

[^7_9]: https://www.golearn.net/liste-de-verbes-francais-disponibles-pour-des-exercices-de-conjugaison.html

[^7_10]: https://etab.ac-poitiers.fr/coll-sauze-vaussais/spip.php?article3181


---

# sur base la liste des NOM  dans le cadre du domaine d'un gestion de syndic d'immeuble en Belgique francophone pour le scénario => C'est le 5 du mois. une personne téléphone car l’ascenseur est tombé en panne, il faut envoyer un technicien pour venir le réparer

Est-ce qu'il manquerait des NOMS ?

En croisant la liste des Noms produits en atelier avec le scénario spécifique de la panne d'ascenseur et le contexte légal belge, voici ce qui manque.[^8_1][^8_2]

***

## Noms manquants — scénario panne d'ascenseur

### Acteurs non encore nommés

- **Ascensoriste** — le prestataire spécialisé en ascenseurs, distinct du technicien généraliste ; en Belgique il est souvent titulaire d'un contrat légal obligatoire d'entretien[^8_2]
- **Organisme de contrôle** — en Belgique (ACTIRIS, AIB-Vinçotte, Apave, Bureau Veritas) : l'ascenseur doit faire l'objet d'un contrôle réglementaire périodique obligatoire[^8_1]
- **Gardien d'immeuble** — premier relais physique sur place avant le gestionnaire, souvent le premier contacté[^8_2]
- **Personne à mobilité réduite (PMR)** — acteur à identifier explicitement car son statut modifie le niveau d'urgence et les obligations légales[^8_3]
- **Juge de paix** — recours légal en Belgique en cas de défaillance du syndic[^8_1]
- **Centrale d'appel 24h/24** — point de contact d'urgence distinct du gestionnaire[^8_2]


### Documents et objets manquants

- **Carnet d'entretien ascenseur** — registre obligatoire des interventions et contrôles réglementaires
- **Rapport de contrôle réglementaire** — produit par l'organisme de contrôle, distinct du rapport d'intervention technicien
- **Contrat d'entretien ascenseur** — contrat spécifique distinct du contrat fournisseur générique (inclut souvent la téléphonie cabine, les visites préventives, les astreintes)
- **Fiche signalétique ascenseur** — numéro de série, constructeur, année, charge maximale, nombre d'arrêts
- **Avis d'arrêt / mise en conformité** — document émis par l'organisme de contrôle si l'ascenseur est jugé non conforme
- **Astreinte** — le créneau de disponibilité contractuel du technicien hors heures ouvrables
- **Notification aux occupants** — document (email / affiche) informant les résidents de la panne et du délai estimé de remise en service
- **Demande d'indemnisation** — dans le cas d'un locataire impacté par une panne prolongée[^8_3]


### Concepts métier absents

- **Délai contractuel de remise en service** — SLA distinct du délai d'intervention (arriver sur site ≠ remettre en service)
- **Pièce de rechange** — élément qui peut bloquer la clôture de l'incident si non disponible en stock
- **Historique de pannes** — agrégat des incidents passés sur un équipement, déclenche le critère de vétusté
- **Seuil de vétusté** — condition qui bascule d'une logique réparation vers une logique remplacement

***

## Récapitulatif par catégorie

| Catégorie | Noms manquants |
| :-- | :-- |
| **Acteurs** | Ascensoriste, Organisme de contrôle, Gardien, PMR, Centrale d'appel |
| **Documents** | Carnet d'entretien, Rapport de contrôle, Fiche signalétique, Avis d'arrêt, Notification occupants |
| **Contrats/SLA** | Contrat d'entretien ascenseur, Astreinte, Délai de remise en service |
| **Concepts métier** | Pièce de rechange, Historique de pannes, Seuil de vétusté |

Le **carnet d'entretien** et la **fiche signalétique ascenseur** sont les deux Noms les plus structurants pour MindBrain : ils portent à eux seuls les qualificatifs réglementaires et les facettes de recherche par équipement.
<span style="display:none">[^8_10][^8_4][^8_5][^8_6][^8_7][^8_8][^8_9]</span>

<div align="center">⁂</div>

[^8_1]: https://crestfield.be/obligations-syndic-copropriete-belgique/

[^8_2]: https://www.drieux-combaluzier.com/syndics-et-administrateurs-de-biens-que-faire-lorsquune-panne-dascenseur-vous-est-signalee

[^8_3]: https://immobilier.lefigaro.fr/vivre-dans-son-logement/guide-vie-dans-le-logement/1100-ascenseur-en-panne-demarches-recours-et-responsabilite/

[^8_4]: https://happysyndic.be/urgence-copropriete-bruxelles/

[^8_5]: https://www.droitbelge.be/fiches_detail.asp?idcat=9\&id=624

[^8_6]: https://www.copropriete-belgique.be/post/comment-gérer-les-travaux-de-la-copropriété

[^8_7]: https://syndicia.be

[^8_8]: https://www.syndicinfo.immo/images/pubs/syndic-info-06_file.pdf

[^8_9]: https://forum.pim.be/topic-284946-order-DESC-ascenseur-en-panne-vandalisme-page-1.html

[^8_10]: https://homegrade.brussels/wp-content/uploads/2023/10/Homegrade_broFR_Copropriete.pdf


---

## Liste complète des VERBES — couverture exhaustive des Noms

Organisée par domaine fonctionnel pour faciliter l'utilisation en atelier.

***

### Signalement \& ouverture d'incident

- Contact/Copropriétaire/Locataire/Occupant → **SIGNALE** → un Incident (via téléphone / email / sms)
- Gardien → **RELAIE** → le Signalement au Gestionnaire
- Centrale d'appel → **REÇOIT** / **QUALIFIE** → le Signalement
- Gestionnaire → **OUVRE** → un Ticket support
- Gestionnaire → **QUALIFIE** → le Signalement en Incident
- Système → **ASSIGNE** → le Ticket à un Collaborateur / Gestionnaire
- Gestionnaire → **IDENTIFIE** → l'Immeuble, le Bloc, le Lot, l'Équipement concerné
- Gestionnaire → **IDENTIFIE** → la Personne à mobilité réduite (PMR) impactée

***

### Gestion de l'équipement \& intervention

- Gestionnaire → **CONSULTE** → la Fiche signalétique ascenseur / Carnet d'entretien
- Gestionnaire → **CONSULTE** → le Contrat d'entretien ascenseur / Contrat fournisseur
- Gestionnaire → **VÉRIFIE** → le Délai contractuel de remise en service / Astreinte
- Gestionnaire → **MANDATE** → l'Ascensoriste / Technicien / Fournisseur
- Ascensoriste/Technicien → **INTERVIENT SUR** → l'Équipement / la Panne
- Ascensoriste → **DIAGNOSTIQUE** → la Panne
- Ascensoriste → **COMMANDE** → une Pièce de rechange
- Ascensoriste → **RÉPARE** / **REMPLACE** → l'Équipement
- Ascensoriste → **REMET EN SERVICE** → l'Ascenseur
- Ascensoriste → **COMMUNIQUE** → le Rapport d'intervention à la Gestion
- Gestionnaire → **ENREGISTRE** → l'Intervention dans le Carnet d'entretien
- Gestionnaire → **MET À JOUR** → l'Historique de pannes

***

### Contrôle réglementaire

- Organisme de contrôle → **CONTRÔLE** → l'Ascenseur (visite périodique obligatoire)
- Organisme de contrôle → **ÉMET** → un Rapport de contrôle réglementaire
- Organisme de contrôle → **ÉMET** → un Avis d'arrêt / Mise en conformité
- Gestionnaire → **SUIT** → les échéances de contrôle réglementaire
- Gestionnaire → **DÉCLARE** → la mise en conformité effectuée

***

### Communication aux occupants

- Gestionnaire → **NOTIFIE** → les Occupants / Locataires / Propriétaires de la panne
- Gestionnaire → **INFORME** → les Occupants du délai estimé de remise en service
- Gestionnaire → **CLÔTURE** → l'Incident
- Gestionnaire → **INFORME** → les Occupants de la remise en service

***

### Cycle documentaire (Devis → BDC → BDL → Facture)

- Gestionnaire → **CRÉE** → un Devis / Bon de commande
- Fournisseur/Ascensoriste → **ÉMET** → un Bon de livraison / une Facture
- Le Syndic/Conseil de copro/AG → **VALIDE** / **REFUSE** → Devis / BDC / BDL / Facture
- Gestionnaire → **RAPPROCHE** → Bon de livraison avec Bon de commande
- Infrastructure comptable → **COMPTABILISE** → la Facture
- Infrastructure comptable → **IMPUTE** → la Facture à un Immeuble / Lot
- Infrastructure comptable → **LETTRE** → la Facture avec le paiement correspondant

***

### Sinistre \& assurance

- Gestionnaire → **DÉCLARE** → le Sinistre à l'assureur (si panne causée par un sinistre)
- Assureur → **MANDATE** → un Expert
- Expert → **ÉVALUE** → le montant du Sinistre
- Assureur → **INDEMNISE** / **REFUSE** → la Copropriété
- Gestionnaire → **SUIT** → le Dossier sinistre
- Locataire → **DÉPOSE** → une Demande d'indemnisation (panne prolongée)

***

### Appels de fonds, décomptes \& comptabilité

- Syndic → **CALCULE** → l'Appel de fonds par tantièmes
- Syndic → **ÉMET** → l'Appel de fonds vers chaque Copropriétaire
- Copropriétaire → **PAIE** → l'Appel de fonds
- Syndic → **ÉTABLIT** → le Décompte annuel par Lot
- Syndic → **REMBOURSE** / **RÉCLAME** → le solde après Décompte

***

### Assemblée générale \& Conseil de copropriété

- Syndic → **CONVOQUE** → l'Assemblée générale / Conseil de copropriété
- Copropriétaire → **SOUMET** → un point à l'Ordre du jour
- Copropriétaire → **VOTE** → une résolution
- AG → **APPROUVE** / **REJETTE** → le Budget prévisionnel / un Devis de remplacement
- AG → **DONNE MANDAT** → au Syndic
- Syndic → **RÉDIGE** → le Procès-verbal d'AG
- Commissaire aux comptes → **AUDITE** → les comptes de la Copropriété

***

### Occupation \& gestion des lots

- Propriétaire → **POSSÈDE** → un Lot
- Propriétaire → **MET EN LOCATION** → un Lot
- Locataire → **LOUE** → un Lot
- Contact → **OCCUPE** → un Lot
- Contact → **REPRÉSENTE** → un Lot (mandataire)
- Locataire → **RÉSILIE** → un Bail
- Syndic → **NOTIFIE** → un changement de Propriétaire aux Copropriétaires

***

### Portefeuille \& équipe de gestion

- Direction → **ATTRIBUE** → un Portefeuille à une Équipe de gestion
- Gestionnaire → **GÈRE** → un Portefeuille d'Immeubles
- Gestionnaire → **TRANSFERT** → un Immeuble à un autre Gestionnaire
- Système → **ALERTE** → le Gestionnaire (échéance contrat, dépassement budget, seuil de vétusté)

***

### Ticket support \& timesheet

- Collaborateur → **ENCODE** → le temps passé sur un Ticket
- TeamLeader → **VALIDE** → le Timesheet
- Infrastructure comptable → **FACTURE** → la Prestation au Client (sur base Timesheet)
- Système → **ESCALADE** → un Ticket (délai dépassé)

***

## Vue synthétique — couverture par Nom

| Nom | Verbes qui le couvrent |
| :-- | :-- |
| Incident | SIGNALE, QUALIFIE, OUVRE, CLÔTURE |
| Ascenseur / Équipement | INTERVIENT SUR, DIAGNOSTIQUE, RÉPARE, REMET EN SERVICE, CONTRÔLE |
| Fiche signalétique | CONSULTE, MET À JOUR |
| Carnet d'entretien | CONSULTE, ENREGISTRE |
| Contrat d'entretien | CONSULTE, VÉRIFIE, RÉSILIE |
| Rapport d'intervention | COMMUNIQUE, ENREGISTRE |
| Rapport de contrôle | ÉMET, SUIT |
| Avis d'arrêt | ÉMET, DÉCLARE (conformité) |
| Pièce de rechange | COMMANDE |
| Historique de pannes | MET À JOUR, CONSULTE |
| Devis / BDC / BDL / Facture | CRÉE, ÉMET, VALIDE, REFUSE, RAPPROCHE, COMPTABILISE, IMPUTE, LETTRE |
| Sinistre | DÉCLARE, ÉVALUE, INDEMNISE, SUIT |
| Appel de fonds | CALCULE, ÉMET, PAIE |
| Décompte | ÉTABLIT, REMBOURSE, RÉCLAME |
| AG / Conseil | CONVOQUE, VOTE, APPROUVE, REJETTE, RÉDIGE |
| Lot | POSSÈDE, LOUE, OCCUPE, REPRÉSENTE |
| Portefeuille | ATTRIBUE, GÈRE, TRANSFERT |
| Ticket / Timesheet | OUVRE, ASSIGNE, ENCODE, ESCALADE, FACTURE |


---

# Si on reste sur un premier niveau d'ontologie autour de l'incident (ici la panne d'ascenceur) liste les différentes ontologies complémentaires qu'il faudra développer pour compléter le modèle. Exemple une ontologie "données" type CRM pour avoir les contacts (nom, prénom, téléphone, email) et créer des connexions sur les autres ontologies (par rôle, par décision, par action, etc.)

La recherche web confirme l'approche modulaire par ontologies complémentaires. Je réponds directement depuis le contexte métier.[^10_1]

***

## Carte des ontologies complémentaires — autour de l'ontologie Incident

L'ontologie **Incident** est le nœud central. Toutes les autres gravitent autour d'elle comme domaines connexes, chacun autonome mais connecté par des relations typées.

***

### O1 — Ontologie Incident *(nœud central)*

Le point de départ. Elle contient : Incident, Signalement, Ticket, Intervention, Rapport d'intervention, Historique de pannes, Avis d'arrêt.

**Connexions sortantes vers toutes les ontologies ci-dessous.**

***

### O2 — Ontologie Contact (CRM)

*"Qui est impliqué ?"*


| Concept | Attributs clés | Connexion vers |
| :-- | :-- | :-- |
| Contact | nom, prénom, téléphone, email, langue (fr/nl/de) | O3 (rôle), O4 (lot), O5 (immeuble) |
| Rôle | type (propriétaire / locataire / occupant / mandataire / gestionnaire / technicien) | O1 (acteur de l'incident) |
| Groupe de contacts | type (conseil de copro / AG / équipe de gestion) | O6 (AG) |

C'est l'ontologie pivot — tout acteur dans les autres domaines est d'abord un Contact ici, connecté ensuite par son rôle contextuel.

***

### O3 — Ontologie Patrimoine (Bâtiment \& Équipements)

*"Sur quoi porte l'incident ?"*

- Immeuble → Bloc → Partie commune / Lot → Équipement
- Fiche signalétique ascenseur, Carnet d'entretien
- Rapport de contrôle réglementaire, Organisme de contrôle
- **Connexion vers O1** : un Équipement est le sujet de l'Incident
- **Connexion vers O8** : un Équipement est couvert par un Contrat

***

### O4 — Ontologie Occupation (Lots \& Droits réels)

*"Qui occupe quoi, à quel titre ?"*

- Lot ← Propriétaire (% tantièmes, type de droit : plein / nu / usufruitier)
- Lot ← Locataire (bail, loyer, date début/fin)
- Lot ← Occupant / Mandataire
- **Connexion vers O2** : Contact joue un Rôle sur un Lot
- **Connexion vers O1** : l'occupant impacté par une panne prolongée → Demande d'indemnisation

***

### O5 — Ontologie Fournisseurs \& Contrats

*"Qui intervient, sous quel engagement ?"*

- Fournisseur / Ascensoriste / Prestataire
- Contrat d'entretien (curatif / préventif / total), Astreinte, SLA, Délai de remise en service
- Pièce de rechange, Centrale d'appel 24h/24
- **Connexion vers O1** : le Fournisseur est mandaté sur un Incident
- **Connexion vers O7** : le Contrat génère des Factures

***

### O6 — Ontologie Gouvernance (AG \& Décisions)

*"Qui décide de quoi ?"*

- Assemblée générale, Conseil de copropriété, Commissaire aux comptes
- Résolution, Procès-verbal, Ordre du jour, Mandat syndic
- Budget prévisionnel, Appel de fonds, Décompte annuel
- **Connexion vers O1** : une Décision AG peut déclencher une intervention (remplacement équipement)
- **Connexion vers O7** : AG approuve les Factures au-delà du seuil budgétaire

***

### O7 — Ontologie Financière \& Comptable

*"Qu'est-ce que ça coûte et comment c'est imputé ?"*

- Devis, Bon de commande, Bon de livraison, Facture
- Imputation (par immeuble / lot / tantièmes), Lettrage, Timesheet
- Appel de fonds, Décompte, Arriéré, Remboursement
- **Connexion vers O1** : une Intervention génère une Facture imputée
- **Connexion vers O5** : la Facture est liée au Contrat fournisseur
- **Connexion vers O9** : les écritures CODA rapprochent les paiements

***

### O8 — Ontologie Assurance \& Sinistres

*"Quand le risque se matérialise, qui couvre quoi ?"*

- Sinistre, Police d'assurance, Expert, Rapport d'expertise
- Déclaration, Indemnisation, Refus, Franchise
- Demande d'indemnisation (locataire)
- **Connexion vers O1** : un Incident peut devenir un Sinistre
- **Connexion vers O7** : l'Indemnisation impacte la comptabilité de la Copropriété

***

### O9 — Ontologie Bancaire (CODA)

*"Comment les flux financiers sont-ils réconciliés ?"*

- Écriture CODA, Communication structurée, IBAN, Virement
- Rapprochement, Lettrage, Rejet, File d'attente identification manuelle
- **Connexion vers O7** : une Écriture CODA solde une Facture ou un Appel de fonds
- **Connexion vers O2** : l'IBAN identifie un Contact (Copropriétaire / Fournisseur)

***

### O10 — Ontologie Réglementaire \& Conformité

*"Quelles obligations légales encadrent chaque action ?"*

- Texte légal (loi copropriété belge, RGPD, normes ascenseur EN81)
- Obligation (contrôle périodique, délai de réponse, archivage PV)
- Organisme de contrôle, Avis d'arrêt, Mise en conformité
- **Connexion vers O3** : un Équipement est soumis à des Obligations réglementaires
- **Connexion vers O6** : une Modification législative peut forcer une Décision AG

***

## Vue d'ensemble — carte des connexions

```
           O10 Réglementaire
                  │
    O6 Gouvernance │ O3 Patrimoine
          │        │        │
    O2 Contact ──► O1 INCIDENT ◄── O5 Fournisseurs
          │        │        │
    O4 Occupation  │  O8 Assurance
                   │
          O7 Financière ◄── O9 CODA
```


***

L'ordre de développement recommandé pour l'atelier suit la dépendance logique : **O2 → O3 → O5 → O1 → O7 → O9**, avec O6, O8 et O10 en deuxième vague. O9 (CODA) est la demande explicite du client — elle s'ancre naturellement sur O7 déjà construit.
<span style="display:none">[^10_10][^10_2][^10_3][^10_4][^10_5][^10_6][^10_7][^10_8][^10_9]</span>

<div align="center">⁂</div>

[^10_1]: http://loic.fejoz.free.fr/datamodel/no-DevOnto.pdf

[^10_2]: https://liris.cnrs.fr/Documents/Liris-1747.pdf

[^10_3]: https://perso.liris.cnrs.fr/amille/enseignements/DEA-ECD/ontologies/construction_ontologie.htm

[^10_4]: https://fr.wikipedia.org/wiki/Ontologie_(informatique)

[^10_5]: https://masa.hypotheses.org/files/2019/10/Donipat_Onto.pdf

[^10_6]: https://publications.polymtl.ca/53394/1/2023_KevinAbouAhmed.pdf

[^10_7]: https://pageperso.lis-lab.fr/bernard.espinasse/wp-content/uploads/2021/12/0-IntroOnto-4P.pdf

[^10_8]: https://publications.polymtl.ca/2922/1/2017_SimonMalenfantCorriveau.pdf

[^10_9]: https://pepite-depot.univ-lille.fr/LIBRE/EDSHS/2021/2021LILUH056.pdf

[^10_10]: https://r-libre.teluq.ca/2585/2/AcfasDIC2004-CRED-LICEF_v04.pdf


---

## Ontologies comme graphes de connaissance — domaine syndic

Un graphe de connaissance n'est pas juste un schéma statique — c'est un modèle qui capture à la fois la **structure** (quoi) et le **déroulement** (comment, dans quel ordre, avec quels états). Chaque ontologie ci-dessous est donc définie avec ses phases, ses états clés et ses connexions.

***

### GK-01 — Gestion d'incident

*Scénario central : panne d'ascenseur*

**Phases :** Signalement → Qualification → Mandat → Intervention → Clôture → Bilan


| État | Déclencheur |
| :-- | :-- |
| Ouvert | Signalement reçu |
| En cours | Technicien mandaté |
| En attente pièce | Pièce de rechange commandée |
| Résolu | Remise en service confirmée |
| Clôturé | Rapport enregistré + occupants notifiés |
| Contentieux | Délai SLA dépassé ou refus fournisseur |

**Connexions** → GK-02 (équipement), GK-05 (fournisseur), GK-09 (facturation), GK-10 (sinistre)

***

### GK-02 — Patrimoine \& équipements

*Graphe de connaissance du bâti*

**Phases :** Création → Exploitation → Maintenance → Contrôle réglementaire → Remplacement

- Chaque équipement porte son historique de pannes, ses contrôles et son seuil de vétusté
- **Connexions** → GK-01 (incidents), GK-06 (conformité réglementaire), GK-05 (contrats d'entretien)

***

### GK-03 — Assemblée Générale (AG)

*Scénario à phases multiples*

**Phases :** Préparation → Convocation → Tenue → Vote → PV → Suivi des décisions


| Phase | Objets produits |
| :-- | :-- |
| Préparation | Ordre du jour, budget prévisionnel, devis soumis |
| Convocation | Lettre de convocation, liste des copropriétaires, procurations |
| Tenue | Feuille de présence, quorum, débats |
| Vote | Résolutions (adoptées / rejetées / abstentions), majorités requises |
| PV | Procès-verbal signé, notification aux absents |
| Suivi | Décisions à exécuter, mandats, appels de fonds déclenchés |

**Connexions** → GK-08 (finances), GK-05 (fournisseurs mandatés par décision AG), GK-01 (travaux déclenchés)

***

### GK-04 — Conseil de copropriété

*Instance intermédiaire entre AG et Syndic*

**Phases :** Constitution → Réunion → Avis → Suivi

- Valide les décisions urgentes entre deux AG
- **Connexions** → GK-03 (prépare l'AG), GK-01 (autorise les interventions urgentes hors seuil)

***

### GK-05 — Fournisseurs \& contrats

*Graphe du cycle de vie prestataire*

**Phases :** Référencement → Consultation → Sélection → Contractualisation → Exécution → Évaluation → Résiliation

- Porte les SLA, astreintes, délais contractuels, historique des prestations
- **Connexions** → GK-01 (mandats), GK-09 (facturation), GK-06 (conformité contrat légal)

***

### GK-06 — Conformité réglementaire

*Graphe des obligations légales*

**Phases :** Identification obligation → Planification → Contrôle → Rapport → Mise en conformité → Archivage

- Loi copropriété belge, normes ascenseur EN81, RGPD, contrôles périodiques obligatoires
- **Connexions** → GK-02 (équipements soumis à obligation), GK-03 (AG informée des non-conformités)

***

### GK-07 — Occupation des lots

*Graphe du cycle de vie d'un lot*

**Phases :** Acquisition → Occupation → Mise en location → Changement d'occupant → Cession


| Rôle | Droits dans le graphe |
| :-- | :-- |
| Plein propriétaire | Vote AG, paie appel de fonds |
| Nu-propriétaire | Vote AG travaux, pas les charges courantes |
| Usufruitier | Paie charges courantes, pas les travaux |
| Locataire | Signale incidents, demande d'indemnisation |
| Mandataire | Représente le propriétaire, reçoit les convocations |

**Connexions** → GK-03 (droits de vote), GK-08 (imputation charges par tantièmes), GK-01 (occupant impacté)

***

### GK-08 — Finances \& comptabilité

*Graphe du cycle financier complet*

**Phases :** Budget → Appel de fonds → Encaissement → Dépenses → Décompte → Audit


| Objet | États |
| :-- | :-- |
| Appel de fonds | Émis / Partiellement payé / Soldé / En retard |
| Facture fournisseur | Reçue / Validée / Contestée / Payée / Lettrée |
| Décompte annuel | En préparation / Soumis AG / Approuvé / Soldé |

**Connexions** → GK-09 (CODA réconcilie les paiements), GK-03 (AG approuve le budget), GK-05 (factures fournisseurs)

***

### GK-09 — Bancaire CODA

*Graphe de réconciliation des flux bancaires*

**Phases :** Réception fichier CODA → Parsing → Identification → Rapprochement → Lettrage → Exceptions


| État écriture | Signification |
| :-- | :-- |
| Brute | Reçue, non identifiée |
| Identifiée | Contact/lot reconnu |
| Rapprochée | Liée à un appel de fonds ou facture |
| Lettrée | Comptabilisée et soldée |
| Rejetée | Erreur IBAN / communication incorrecte |
| En attente | Identification manuelle requise |

**Connexions** → GK-08 (solde les écritures comptables), GK-11 (CRM identifie le payeur par IBAN)

***

### GK-10 — Sinistres \& assurances

*Graphe du cycle sinistre*

**Phases :** Détection → Déclaration → Expertise → Décision assureur → Indemnisation → Clôture

- **Connexions** → GK-01 (un incident peut devenir un sinistre), GK-08 (indemnisation impacte la comptabilité), GK-02 (équipement endommagé)

***

### GK-11 — CRM Contacts \& rôles

*Graphe pivot — connecté à toutes les ontologies*

**Phases :** Création contact → Attribution rôle(s) → Activité → Archivage

- Un Contact unique peut jouer plusieurs rôles selon le contexte : propriétaire sur un lot, locataire sur un autre, membre du conseil de copropriété sur un troisième
- **Connexions** → tous les autres GK par le mécanisme de rôle contextuel

***

### GK-12 — Décomptes \& appels de fonds spéciaux

*Graphe des flux exceptionnels*

**Phases :** Décision AG → Calcul quote-part → Appel exceptionnel → Encaissement → Exécution travaux → Décompte final

- Distinct du GK-08 car déclenché par une décision de gouvernance, pas par le cycle comptable ordinaire
- **Connexions** → GK-03 (décision AG), GK-05 (fournisseur des travaux), GK-09 (CODA encaisse)

***

## Vue d'ensemble — hiérarchie des graphes

```
GK-11 CRM ──────────────────────────────────┐
    │                                        │
GK-07 Occupation ──► GK-03 AG ──► GK-04 Conseil
    │                    │
GK-02 Patrimoine ──► GK-01 INCIDENT ◄── GK-05 Fournisseurs
    │                    │                    │
GK-06 Conformité    GK-10 Sinistre       GK-09 CODA
                         │                    │
                    GK-08 Finances ◄──── GK-12 Appels spéciaux
```


***

L'ordre de construction recommandé reste **GK-11 → GK-02 → GK-01 → GK-05 → GK-08 → GK-09**, puis une deuxième vague **GK-03 → GK-07 → GK-10 → GK-06 → GK-04 → GK-12**. GK-09 (CODA) reste la priorité client — il s'ancre sur GK-08 déjà structuré.

---

## Ontologies officielles applicables au domaine syndic

L'objectif est de **ne pas réinventer** ce qui existe — chaque standard ci-dessous couvre un sous-domaine précis et peut être importé comme namespace dans MindBrain pour normaliser les désignations.

***

## Couche 1 — Personnes physiques

### Core Person Vocabulary (W3C / ISA² — EU)

Standard européen minimal pour toute personne physique. Capture : nom, prénom, date de naissance, genre, adresse, identifiant national. C'est le **plus petit commun dénominateur interopérable** entre administrations européennes.[^12_1]

- Namespace : `https://www.w3.org/ns/person`
- Champs utiles syndic : `person:birthName`, `person:patronymicName`, `person:residency`
- Extension belge directe : **OSLO Persoon** (Flandre)[^12_2][^12_3]


### Registre National belge (RRN / IBZ)

Source autoritaire pour toute personne physique en Belgique. Identifiant clé : le **numéro de registre national** (11 chiffres, YYMMDD-XXX-CC). Utilisé pour dédupliquer les contacts dans GK-11.[^12_4]

- Base légale : Loi du 8 août 1983
- Champs : nom, prénom, date/lieu naissance, nationalité, adresse, état civil, profession


### BAEC (Banque de données des Actes de l'État Civil)

Référentiel des actes d'état civil belges depuis le 31/03/2019. Remplace les registres papier communaux. Pertinent pour valider les actes de naissance, mariage, décès — notamment lors d'un **changement de propriétaire** (succession, divorce).[^12_5]

***

## Couche 2 — Entités juridiques \& organisations

### Core Business Vocabulary / Core Organization Vocabulary (W3C SEMIC)

Standard EU pour toute entité dotée d'une existence juridique  :[^12_6][^12_7]

- `org:Organization` → syndic, copropriété (ACP), fournisseur, assureur
- `org:OrganizationalUnit` → équipe de gestion, conseil de copropriété
- `legal:legalName`, `legal:companyStatus`, `legal:registeredAddress`


### W3C Organization Ontology

Modélise les structures organisationnelles et les rôles  :[^12_8]

- `org:memberOf` → un Contact est membre d'un Conseil de copropriété
- `org:Post` → rôle occupé (gestionnaire, président AG, commissaire aux comptes)
- `org:hasMember` → composition d'un groupe de propriétaires


### Banque Carrefour des Entreprises (BCE) — Belgique

Équivalent belge du SIREN français. Tout fournisseur, syndic ou ACP (Association des Copropriétaires) possède un **numéro BCE** (format 0XXX.XXX.XXX). Identifiant de référence pour GK-05 et GK-11.

***

## Couche 3 — Foncier, droits \& propriété

### LADM / ISO 19152 — Land Administration Domain Model

Le standard de référence international. Couvre exactement les besoins du syndic :[^12_9][^12_10]


| Package LADM | Contenu | Usage syndic |
| :-- | :-- | :-- |
| **Party** | Personnes physiques et morales | Copropriétaire, syndic, notaire |
| **RRR** | Rights, Restrictions, Responsibilities | Pleine propriété, usufruit, nu-propriété, servitude |
| **SpatialUnit** | Parcelle, bâtiment, unité spatiale | Immeuble, lot, partie commune |
| **Source** | Acte notarié, titre, document source | Acte de vente, règlement de copropriété |

- `LA_Party` → toute personne ou entité liée à un droit
- `LA_RRR` → le droit lui-même (type, quote-part, date début/fin)
- `LA_BasicAdministrativeUnit` → l'immeuble ou le lot comme unité administrative
- `LA_Source` → l'acte notarié qui fonde le droit[^12_11][^12_9]


### GeoSPARQL / CadGIS (SPF Finances Belgique)

Extension spatiale pour localiser les unités LADM. CadGIS est le cadastre officiel belge, accessible via WFS/WMS. Permet de relier un **lot** à sa **parcelle cadastrale** (CAPAKEY).

***

## Couche 4 — Relations de droit \& propriété partagée

### OwnershipRelation (pattern LADM + OWL)

Pas un standard unique, mais un **pattern de modélisation** recommandé issu de LADM :

```
Contact ──[LA_RRR]──► Lot
   └── typeOfRight : PleinePropriété / Usufruit / NuePropriété
   └── share : 1/2, 1/3, tantièmes
   └── sourceDocument : Acte notarié (LA_Source)
   └── startDate / endDate
```

La règle de décision rappelée dans ta question s'applique directement :


| Cas | Modélisation |
| :-- | :-- |
| Personne seule propriétaire | `LA_Party (Person)` + `LA_RRR (FullOwnership)` |
| Couple marié copropriétaire | 2 × `LA_Party` + 2 × `LA_RRR` avec quote-part |
| SCI / ACP / SA propriétaire | `LA_Party (Organization)` + `LA_RRR` |
| Usufruit + nue-propriété | 2 × `LA_RRR` de types différents sur même `SpatialUnit` |


***

## Couche 5 — Localisation \& adresses

### Core Location Vocabulary (W3C ISA²)

Standard EU pour toute adresse  :[^12_1]

- `locn:Address`, `locn:thoroughfare`, `locn:postCode`, `locn:adminUnitL2`
- Extension belge : **BeSt Address** (SPF Finances) — référentiel officiel des adresses belges avec identifiant unique par adresse

***

## Couche 6 — Échanges financiers \& comptables

### ISO 20022 — Messages financiers

Standard pour les flux bancaires, dont le format **CODA** belge est une implémentation nationale. Fournit le vocabulaire normalisé pour : `CdtTrfTxInf` (virement), `RmtInf` (communication), `Amt` (montant).[^12_12]

### XBRL / Belgian GAAP

Pour les décomptes annuels soumis à l'AG et aux commissaires aux comptes.

***

## Carte de correspondance — standards → ontologies MindBrain

| Ontologie MindBrain | Standard(s) à importer |
| :-- | :-- |
| GK-11 CRM Contacts | Core Person Vocabulary + RRN/BAEC |
| GK-11 Entités juridiques | Core Business Vocabulary + BCE |
| GK-07 Occupation \& droits | LADM ISO 19152 (Party + RRR + SpatialUnit) |
| GK-03 Patrimoine | LADM SpatialUnit + CadGIS CAPAKEY |
| GK-05 Fournisseurs | Core Business Vocabulary + BCE |
| GK-06 Gouvernance | W3C Organization Ontology |
| GK-08 Finances | ISO 20022 (CODA) + XBRL |
| GK-09 CODA | ISO 20022 directement |
| GK-10 Conformité | LADM Source + textes légaux belges |

La stratégie d'implémentation dans MindBrain : importer les namespaces comme **ontologies de référence en lecture seule**, et construire les ontologies métier syndic comme des **profils nationaux** (au sens LADM) qui étendent ces standards sans les modifier. C'est exactement le mécanisme prévu par LADM Part 1 pour les profils nationaux.[^12_11]
<span style="display:none">[^12_13][^12_14][^12_15][^12_16][^12_17][^12_18][^12_19][^12_20][^12_21][^12_22][^12_23][^12_24][^12_25][^12_26][^12_27][^12_28][^12_29][^12_30]</span>

<div align="center">⁂</div>

[^12_1]: https://interoperable-europe.ec.europa.eu/collection/semic-support-centre/solution/core-person-vocabulary

[^12_2]: https://www.vlaanderen.be/digitaal-vlaanderen/onze-diensten-en-platformen/oslo

[^12_3]: https://interoperable-europe.ec.europa.eu/collection/oslo-open-standards-local-administrations-flanders

[^12_4]: https://www.ibz.rrn.fgov.be/fr/professionnel/registre-national

[^12_5]: https://www.wallonie.be/fr/demarches/demander-un-extraitcopie-dun-acte-detat-civil

[^12_6]: https://www.w3.org/mid/CAC1Gg8TnUe-1B_3sDbCSyMqm5PyTeyNaF2WFOmm7OgoST2AJPQ%2540mail.gmail.com

[^12_7]: https://github.com/SEMICeu/Core-Business-Vocabulary/issues/51

[^12_8]: https://www.w3.org/TR/vocab-org/

[^12_9]: https://www.iso.org/standard/81264.html

[^12_10]: https://www.iso.org/standard/51206.html

[^12_11]: https://www.iso.org/standard/81263.html

[^12_12]: https://www.belgium.be/en/familie/identiteit/akten_en_registers

[^12_13]: https://justonweb.be/fr/extracts/civil-records

[^12_14]: https://www.orangeconnect.be/actualites/actualite/720858527752525347

[^12_15]: https://be.diplomatie.gouv.fr/fr/etat-civil

[^12_16]: https://www.weka.fr/fiches-et-outils/mariage-avec-un-etranger-belgique-10772/

[^12_17]: https://avocat-moszynski.be/le-droit-immobilier-en-belgique-comprendre-les-fondamentaux/

[^12_18]: https://www.adde.be/documents/newsletters-2016/edito decembre 2016.pdf

[^12_19]: https://www.joassinimmo.be/content,la-deontologie-de-l-agent-immobilier-la-garantie-d-un-service-honnete-et-serieux,1638

[^12_20]: http://diplomatie.belgium.be/fr/pour-les-belges-letranger/etat-civil/actes-de-letat-civil

[^12_21]: https://www.ipi.be/lagent-immobilier/la-deontologie-de-lagent-immobilier

[^12_22]: https://fr.wikipedia.org/wiki/État_civil

[^12_23]: https://www.notaire.be/immobilier/le-logement-et-la-famille/acheter-sans-etre-maries-comment-proteger-son-partenaire

[^12_24]: https://fig.net/resources/proceedings/fig_proceedings/7_2023/papers/se03/SE03_lemmen_van_oosterom_et_al_12362_abs.pdf

[^12_25]: https://gdmc.nl/3dcadastres/Figpub84.pdf

[^12_26]: https://isprs-archives.copernicus.org/articles/XXXVIII-4-C21/31/2011/isprsarchives-XXXVIII-4-C21-31-2011.pdf

[^12_27]: https://committee.iso.org/files/live/users/fh/aj/aj/tc211contributor@iso.org/files/Presentations/2009-11 Quebec/Oosterom_LADM_Workshop_Quebec.pdf

[^12_28]: https://www.w3.org/2011/gld/track/issues/38

[^12_29]: https://interoperable-europe.ec.europa.eu/collection/oslo-open-standards-local-administrations-flanders/solution/oslo-open-standards-linked-administrations-flanders

[^12_30]: https://cdn.standards.iteh.ai/samples/81263/ede168236f7d456fa0e22593fcc7b4a3/ISO-FDIS-19152-1.pdf


---

# Quels seraient les modèles ontologiques manquants dans le cadre d'une gestion de syndic que nous n'avons pas encore évoqués? (et surtout pour les listes de procédures à transformer en graphe de connaissance) pour aider à la gestion de l'entreprise.

Voici les graphes de connaissance manquants, organisés en trois niveaux : **procédures métier**, **gestion interne de l'entreprise syndic**, et **domaines transversaux**.

***

## Procédures métier non encore couvertes

### GK-13 — Gestion locative

*Distincte de la copropriété : s'applique aux parties privatives gérées pour compte de propriétaires bailleurs*[^13_1]

**Phases :** Mise en location → Entrée → Vie du bail → Sortie → Remise sur marché

- États clés : Vacant / En location / Préavis reçu / En litige / En travaux inter-locataires
- Objets spécifiques : Bail, État des lieux entrée/sortie, Garantie locative, Indexation annuelle, Quittance de loyer
- **Connexions** → GK-07 (occupation), GK-08 (loyers perçus), GK-11 (locataire comme contact)

***

### GK-14 — Travaux \& rénovation

*Procédure distincte de GK-01 (incident) car planifiée, multi-étapes et soumise à gouvernance*

**Phases :** Identification besoin → Étude → Devis → Décision AG → Commande → Exécution → Réception → Garantie

- États clés : En étude / Approuvé / En cours / Réceptionné avec réserves / Clôturé / En garantie décennale
- Objets spécifiques : Cahier des charges, Appel d'offres, PV de réception, Décompte travaux, Garantie décennale
- **Connexions** → GK-03 (AG décide), GK-05 (fournisseurs), GK-08 (financement), GK-10 (sinistre si malfaçon)

***

### GK-15 — Contentieux \& recouvrement

*Procédure de gestion des arriérés de charges et conflits juridiques*

**Phases :** Détection arriéré → Relance amiable (niveaux 1/2/3) → Mise en demeure → Procédure judiciaire → Jugement → Exécution → Clôture

- États clés : À jour / Arriéré / En relance / En demeure / Au tribunal / Jugement obtenu / Irrécouvrable
- Objets spécifiques : Lettre de relance, Mise en demeure, Acte de procédure, Jugement, Saisie, Juge de paix (Belgique)
- **Connexions** → GK-08 (finances), GK-07 (occupation — saisie du lot possible), GK-11 (débiteur)

***

### GK-16 — Changement de syndic

*Procédure critique, réglementée, avec transfert de dossiers*

**Phases :** Décision AG → Notification → Transfert archives → Transfert fonds → Passation comptes → Entrée en fonction nouveau syndic

- Objets spécifiques : PV AG révocation, Inventaire des fonds, État des dossiers en cours, Clé de l'immeuble, Accès systèmes
- **Connexions** → GK-03 (AG décide), GK-08 (transfert fonds), GK-01 (incidents en cours à transférer)

***

### GK-17 — Vente / mutation d'un lot

*Procédure déclenchée à chaque changement de propriétaire*

**Phases :** Notification → Renseignements pré-vente (état des charges) → Acte notarial → Mise à jour registres → Transfert obligations

- Objets spécifiques : Demande de renseignements syndic, Attestation de charges (obligatoire en Belgique), Acte notarial, Nouvelle répartition tantièmes
- **Connexions** → GK-07 (occupation), GK-06 (droits LADM), GK-08 (apurement arriérés)

***

### GK-18 — Plan pluriannuel de travaux (PPT)

*Obligation légale croissante en Belgique — anticipation des gros travaux sur 10 ans*

**Phases :** Diagnostic technique → Priorisation → Budget pluriannuel → Approbation AG → Suivi annuel → Révision

- Objets spécifiques : Rapport diagnostic, Réserve fonds travaux, Planification par exercice, Mise à jour annuelle
- **Connexions** → GK-14 (travaux), GK-03 (AG approuve), GK-02 (patrimoine — état des équipements)

***

## Gestion interne de l'entreprise syndic

### GK-19 — Ressources humaines \& compétences

*Graphe de connaissance interne — qui sait faire quoi, sur quels immeubles*

**Phases :** Recrutement → Onboarding → Attribution portefeuille → Évaluation → Formation → Départ

- Objets spécifiques : Profil collaborateur, Compétences (juridique, technique, comptable), Portefeuille assigné, Charge de travail, Agrément IPI (Belgique)[^13_2]
- **Connexions** → GK-11 (collaborateur = contact interne), GK-05 (portefeuille immeubles), GK-20 (formation)

***

### GK-20 — Conformité professionnelle \& formation continue

*Obligation légale IPI — agrément et formation annuelle obligatoire en Belgique*[^13_2]

**Phases :** Agrément initial → Formation continue → Renouvellement → Audit IPI

- Objets spécifiques : Numéro agrément IPI, Heures de formation, Attestations, Rapport d'audit déontologique
- **Connexions** → GK-19 (RH), GK-10 (conformité réglementaire)

***

### GK-21 — Gestion documentaire \& archivage

*Procédure transversale — chaque objet produit génère un document à archiver*

**Phases :** Création → Classification → Partage → Archivage → Purge (RGPD)

- Objets spécifiques : PV d'AG (conservation 5 ans min.), Contrats (durée vie + 10 ans), Données personnelles (RGPD — durée limitée), Registre des traitements
- **Connexions** → tous les GK (chaque procédure produit des documents)

***

### GK-22 — Facturation client \& rentabilité

*Graphe de la prestation syndic — distinct de la comptabilité copropriété*

**Phases :** Convention de gestion → Prestation → Timesheet → Facturation → Encaissement → Analyse rentabilité

- Objets spécifiques : Convention de gestion (honoraires forfaitaires + prestations exceptionnelles), Tarif prestation, Timesheet collaborateur, Facture syndic, Marge par immeuble
- **Connexions** → GK-19 (RH + timesheet), GK-09 (CODA encaisse), GK-05 (portefeuille)

***

### GK-23 — Communication client

*Graphe de toutes les interactions entrantes et sortantes*

**Phases :** Réception → Qualification → Traitement → Réponse → Archivage

- Objets spécifiques : Email (Front/thread), SMS, Courrier, Appel téléphonique, Portail copropriétaire, Notification automatique
- États clés : Reçu / Assigné / En attente réponse / Répondu / Escaladé / Clôturé
- **Connexions** → GK-01 (signalement incident), GK-11 (contact expéditeur), GK-21 (archivage)

***

## Domaines transversaux manquants

### GK-24 — Énergie \& performance énergétique

*Montée en puissance réglementaire — PEB, audit énergétique, rénovation obligatoire*

- Objets spécifiques : Certificat PEB immeuble, Compteur commun, Consommation par exercice, Plan de rénovation énergétique
- **Connexions** → GK-02 (équipements), GK-18 (PPT), GK-10 (conformité)

***

### GK-25 — Sécurité \& prévention incendie

*Obligation légale distincte des incidents courants*

- Objets spécifiques : Plan d'évacuation, Registre de sécurité, Contrôle détecteurs/extincteurs, Formation gardien
- **Connexions** → GK-02 (équipements), GK-06 (conformité), GK-10 (réglementaire)

***

### GK-26 — Gestion des plaintes \& médiation

*Distincte du contentieux — résolution amiable avant recours juridique*

**Phases :** Plainte reçue → Instruction → Médiation → Accord / Escalade contentieux

- **Connexions** → GK-15 (contentieux si échec), GK-23 (communication), GK-04 (conseil copro comme médiateur)

***

## Vue d'ensemble complète — 26 graphes de connaissance

```
━━━ PROCÉDURES MÉTIER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GK-01 Incident          GK-13 Gestion locative
GK-03 AG                GK-14 Travaux
GK-04 Conseil copro     GK-15 Contentieux
GK-08 Finances          GK-16 Changement syndic
GK-09 CODA              GK-17 Mutation lot
GK-10 Sinistre          GK-18 Plan pluriannuel

━━━ GESTION INTERNE SYNDIC ━━━━━━━━━━━━━━━━━━━━━━━━
GK-19 RH & compétences  GK-22 Facturation
GK-20 Conformité IPI    GK-23 Communication client
GK-21 Documentaire      GK-26 Plaintes & médiation

━━━ PATRIMOINE & RÉFÉRENTIELS ━━━━━━━━━━━━━━━━━━━━━
GK-02 Patrimoine        GK-24 Énergie / PEB
GK-05 Fournisseurs      GK-25 Sécurité incendie
GK-06 Conformité régl.
GK-07 Occupation

━━━ PIVOTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GK-11 CRM Contacts      GK-12 Appels fonds spéciaux
```

Les **GK non encore évoqués les plus urgents** pour compléter le modèle opérationnel sont GK-14 (travaux), GK-15 (contentieux), GK-17 (mutation lot) et GK-22 (facturation syndic) — ce sont les quatre procédures qui génèrent le plus de flux documentaires et financiers dans un syndic belge moyen.[^13_3][^13_1]
<span style="display:none">[^13_10][^13_11][^13_12][^13_13][^13_14][^13_15][^13_4][^13_5][^13_6][^13_7][^13_8][^13_9]</span>

<div align="center">⁂</div>

[^13_1]: https://www.op.be/news/syndic-et-gestion-locative-quelles-differences

[^13_2]: https://www.joassinimmo.be/content,la-deontologie-de-l-agent-immobilier-la-garantie-d-un-service-honnete-et-serieux,1638

[^13_3]: https://copropriete.hellio.com/blog/vie-copro/modeles-gestion-syndic

[^13_4]: https://forum.pim.be/topic-275780-controle-de-la-gestion-du-syndic-par-un-coproprietaire-page-1.html

[^13_5]: https://www.institutparisregion.fr/fileadmin/NewEtudes/000pack4/Etude_2982/Les_mutations_contemporaines_des_syndics_de_copropriete.pdf

[^13_6]: https://www.urbanisme-puca.gouv.fr/IMG/pdf/ouvrage_mpl_copros_def.pdf

[^13_7]: https://fnau.org/wp-content/uploads/2023/11/les_mutations_contemporaines_des_syndics_de_copropriete.pdf

[^13_8]: https://realestate.orisha.com/blog/conseils/gestion-immobiliere-optimisez-votre-efficacite-avec-les-meilleures-pratiques-et-outils-professionnels/

[^13_9]: https://www.smals.be/fr/content/les-graphes-de-connaissance-incontournable-pour-lintelligence-artificielle

[^13_10]: https://www.notaire.be/immobilier/acheter-et-vendre-un-bien-immobilier/acheter-un-appartement/les-organes-de-la-copropriete

[^13_11]: https://www.armtek.fr/article-1---partie-1---ontologie-vs-information-tacite-structurer-ou-capitaliser-limplicite-dans-la-gestion-des-connaissances

[^13_12]: https://www.notaire.be/sites/default/files/files/2025-07/Brochure-guide-pour-copropriétaires-2022 (1).pdf

[^13_13]: https://hal.science/hal-03704042v1/document

[^13_14]: https://hal.science/hal-04071961/document

[^13_15]: https://opac.univ-mila.dz/z/00415511.pdf


---

# CONDITIONS : "Dans quelles circonstances ça change ?" : Les règles implicites du métier qui déclenchent une action ou un changement d'état

Dans le cadre du scénario initial (incident de l'ascenceur) on a pas encore développé correctement cette partie des "conditions"

Le bloc CONDITIONS produit en atelier  liste des déclencheurs génériques (Changement de propriétaire, AG, Signalement...) mais ne développe pas les **règles de transition d'état spécifiques à l'incident ascenseur**. Voici la complétion complète.[^14_1]

***

## CONDITIONS — Scénario panne d'ascenseur

Chaque condition est structurée en triplet : **Si [état] + [déclencheur] → alors [action / changement d'état]**

***

### Phase 1 — Réception du signalement

| \# | Condition | → Action / Nouvel état |
| :-- | :-- | :-- |
| C1 | Appel reçu ET personne coincée dans la cabine | → **URGENCE ABSOLUE** : appel pompiers (112) immédiat, gestionnaire notifié en parallèle |
| C2 | Appel reçu ET ascenseur bloqué entre deux étages (sans personne) | → Ouverture ticket **Priorité Haute**, mandat ascensoriste sous astreinte |
| C3 | Appel reçu ET ascenseur hors service mais personne non coincée | → Ouverture ticket **Priorité Normale**, mandat dans délai contractuel |
| C4 | Signalement reçu par email / SMS (pas par téléphone) | → Accusé de réception automatique + qualification manuelle par gestionnaire sous 2h |
| C5 | Immeuble identifié ET PMR recensée dans les lots | → Notification PMR prioritaire + escalade gestionnaire senior |


***

### Phase 2 — Qualification \& mandat

| \# | Condition | → Action / Nouvel état |
| :-- | :-- | :-- |
| C6 | Équipement identifié ET contrat d'entretien actif | → Mandat direct ascensoriste contractuel, pas de devis requis |
| C7 | Équipement identifié ET contrat expiré ou absent | → Consultation 3 devis obligatoire si montant estimé > seuil AG |
| C8 | Équipement identifié ET contrat actif MAIS délai contractuel dépassé | → Escalade gestionnaire + notification formelle au fournisseur (SLA breach) |
| C9 | Fournisseur habituel indisponible (astreinte non répondue sous 30 min) | → Activation fournisseur de secours (liste pré-approuvée) |
| C10 | Heure du signalement hors heures ouvrables | → Activation procédure astreinte, surcoût astreinte applicable selon contrat |


***

### Phase 3 — Intervention en cours

| \# | Condition | → Action / Nouvel état |
| :-- | :-- | :-- |
| C11 | Technicien sur site ET panne réparable sur place | → Intervention immédiate, rapport d'intervention à produire sous 24h |
| C12 | Technicien sur site ET pièce de rechange manquante | → Statut **"En attente pièce"**, délai estimé communiqué aux occupants |
| C13 | Délai d'attente pièce > 5 jours ouvrables | → Notification AG / Conseil de copropriété, évaluation solution temporaire |
| C14 | Panne récurrente sur même équipement (≥ 2 en 6 mois) | → Déclenchement diagnostic complet + inscription au Plan Pluriannuel de Travaux |
| C15 | Rapport de contrôle réglementaire indique non-conformité | → Mise hors service obligatoire + procédure mise en conformité (GK-06) |


***

### Phase 4 — Clôture \& facturation

| \# | Condition | → Action / Nouvel état |
| :-- | :-- | :-- |
| C16 | Ascenseur remis en service ET rapport d'intervention reçu | → Notification occupants + mise à jour carnet d'entretien + statut **"Clôturé"** |
| C17 | Facture reçue ET montant ≤ seuil de délégation gestionnaire | → Validation gestionnaire seule, comptabilisation directe |
| C18 | Facture reçue ET montant > seuil de délégation MAIS ≤ seuil AG | → Validation Conseil de copropriété requise |
| C19 | Facture reçue ET montant > seuil AG | → Inscription à l'ordre du jour AG suivante ou AG extraordinaire |
| C20 | Facture reçue ET montant > devis initial de plus de 15% | → Contestation formelle au fournisseur, gel du paiement |


***

### Phase 5 — Escalades \& cas limites

| \# | Condition | → Action / Nouvel état |
| :-- | :-- | :-- |
| C21 | Panne causée par un sinistre identifié (ex. fuite d'eau) | → Ouverture dossier sinistre assurance en parallèle (GK-10) |
| C22 | Panne résulte d'une malveillance / vandalisme | → Dépôt de plainte, déclaration assurance, rapport photographique |
| C23 | Contrôle réglementaire échu (date dépassée) | → Mise hors service préventive + mandat organisme de contrôle en urgence |
| C24 | Locataire impacté par panne > 10 jours | → Évaluation demande d'indemnisation, notification propriétaire-bailleur |
| C25 | Immeuble sans gardien ET accès technique impossible | → Contact copropriétaire de référence (clé technique), procédure accès d'urgence |


***

## Récapitulatif — arbre de décision simplifié

```
SIGNALEMENT REÇU
     │
     ├─ Personne coincée ? ──► OUI → C1 (112 immédiat)
     │
     ├─ PMR impactée ? ──────► OUI → C5 (escalade senior)
     │
     ├─ Contrat actif ? ─────► NON → C7 (devis obligatoire)
     │                         OUI → C6 (mandat direct)
     │                              └─ Hors horaires ? → C10 (astreinte)
     │
     ├─ Pièce manquante ? ───► OUI → C12 → délai > 5j ? → C13
     │
     ├─ Panne récurrente ? ──► OUI → C14 (PPT)
     │
     ├─ Sinistre associé ? ──► OUI → C21 (assurance)
     │
     └─ CLÔTURE
          ├─ Facture ≤ seuil gestionnaire → C17
          ├─ Facture > seuil AG → C19
          └─ Facture > devis +15% → C20
```


***

Les conditions **C14** (récurrence → PPT) et **C21** (incident → sinistre) sont les deux pivots les plus structurants pour MindBrain — elles créent des **liens inter-graphes** entre GK-01, GK-18 et GK-10, ce que le bloc CONDITIONS de l'atelier ne pouvait pas capturer avec de simples post-its.

<div align="center">⁂</div>

[^14_1]: image.jpg


---

# Propose moi une liste des différentes catégories d'ontologies qu'on a abordé dans cette discussion.

Voici la synthèse des catégories d'ontologies abordées dans cette discussion, organisées par nature.

***

## Catégories d'ontologies — synthèse de la discussion

### 1. Ontologies de modélisation métier (les 5 actes)

Les briques fondamentales produites en atelier, indépendantes du domaine :

- **Noms** — les objets qui existent et qu'on peut nommer, compter, stocker
- **Verbes** — les actions et flux qui relient deux objets
- **Qualificatifs** — les caractéristiques qui décrivent l'état d'un objet à un instant donné
- **Conditions** — les règles implicites qui déclenchent une action ou un changement d'état
- **Modes de recherche** — les facettes d'interrogation pour rendre le modèle exploitable

***

### 2. Ontologies de référentiels officiels (standards externes)

| Sous-catégorie | Standards |
| :-- | :-- |
| **Personnes physiques** | Core Person Vocabulary (W3C), OSLO Persoon, Registre National belge (RRN), BAEC |
| **Entités juridiques** | Core Business Vocabulary (W3C SEMIC), BCE belge, W3C Organization Ontology |
| **Foncier \& droits** | LADM / ISO 19152 (Party, RRR, SpatialUnit, Source), CadGIS / CAPAKEY |
| **Adresses** | Core Location Vocabulary, BeSt Address |
| **Financier \& bancaire** | ISO 20022, format CODA belge, XBRL / Belgian GAAP |
| **Réglementaire** | Loi copropriété belge, normes EN81 (ascenseurs), RGPD, agrément IPI |


***

### 3. Ontologies domaines métier syndic (graphes de connaissance)

| Sous-catégorie | GK concernés |
| :-- | :-- |
| **Patrimoine \& technique** | GK-02 Patrimoine/équipements, GK-24 Énergie/PEB, GK-25 Sécurité incendie |
| **Incidents \& sinistres** | GK-01 Incident, GK-10 Sinistres \& assurances |
| **Occupation \& droits** | GK-07 Occupation des lots, GK-17 Mutation/vente lot |
| **Gouvernance** | GK-03 Assemblée Générale, GK-04 Conseil de copropriété |
| **Fournisseurs** | GK-05 Fournisseurs \& contrats |
| **Finances** | GK-08 Finances \& comptabilité, GK-09 CODA, GK-12 Appels de fonds spéciaux |
| **Travaux \& planification** | GK-14 Travaux \& rénovation, GK-18 Plan Pluriannuel de Travaux |
| **Juridique** | GK-15 Contentieux \& recouvrement, GK-26 Plaintes \& médiation |
| **Gestion locative** | GK-13 Gestion locative |
| **Transition syndic** | GK-16 Changement de syndic |
| **Conformité** | GK-06 Conformité réglementaire, GK-20 Conformité IPI |


***

### 4. Ontologies de gestion interne du syndic

- **GK-11** CRM Contacts \& rôles — ontologie pivot connectée à tout
- **GK-19** Ressources humaines \& compétences
- **GK-21** Gestion documentaire \& archivage (RGPD)
- **GK-22** Facturation client \& rentabilité (timesheet → honoraires)
- **GK-23** Communication client (email, sms, portail, Front)

***

### 5. Catégories transversales (patterns de modélisation)

Ces catégories ne sont pas des ontologies autonomes mais des **patterns réutilisables** dans toutes les autres :

- **Cycle documentaire** — Devis → BDC → BDL → Facture → Lettrage
- **Cycle d'état** — Ouvert / En cours / En attente / Résolu / Clôturé / Contentieux
- **Relation de droit** — OwnershipRelation avec quote-part, type de droit, acte source, dates
- **Rôle contextuel** — un Contact joue des rôles différents selon le GK dans lequel il apparaît
- **Seuil de délégation** — condition financière qui détermine qui valide (gestionnaire / conseil / AG)

***

Au total : **5 catégories**, **26 graphes de connaissance métier** identifiés, **6 familles de standards officiels** mobilisables comme namespaces dans MindBrain. Les ontologies **GK-11 (CRM)**, **GK-01 (Incident)** et **GK-09 (CODA)** sont les trois pivots à construire en priorité — tout le reste s'y connecte.

