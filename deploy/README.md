# LISTIXAAR V10 — Mise en ligne

Cette version est préparée pour le déploiement public.

## 1. Serveur
Choisir un hébergeur compatible Node.js + PostgreSQL.

## 2. Domaine
Connecter le domaine LISTIXAAR au serveur via DNS.

## 3. HTTPS
Activer TLS/HTTPS sur le domaine.

## 4. Base de données
Créer PostgreSQL en production puis exécuter, dans l'ordre :
- database/schema.sql
- database/seed_12x12.sql
- database/auth.sql
- database/dashboard.sql
- database/billing.sql
- database/security.sql

## 5. Variables secrètes
Créer les variables d'environnement à partir de `.env.example`.
Générer un JWT_SECRET long et aléatoire.
Ne jamais mettre les secrets dans `public/`.

## 6. Démarrage
npm install
npm start

## 7. Avant ouverture publique
Tester `/api/health`, inscription, connexion, Abjad, زوج, historique et protections Premium.

## Paiement
Le paiement reste volontairement désactivé tant que le programme n'est pas validé en ligne.
Le code marchand sera ajouté ensuite, côté serveur uniquement.
