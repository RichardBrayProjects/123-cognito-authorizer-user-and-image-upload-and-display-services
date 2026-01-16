# Work in progress

```

The SPA client requests the Cognito Domain and CLient ID from https://user-api.uptickart.com
This is a non-authenticated route, doesn't engage with the authorizer and therefore works

However, when the SPA wants the user profile, profileRoutes.ts contains

router.use(attachAuth, requireAuth);

which in turn use auth.ts which isn't working (its not fixed until repo 125)

```
