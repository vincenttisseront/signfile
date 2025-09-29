@echo off
:: ---------------------------------------------
:: Script de test pour vérification de signature
:: ---------------------------------------------
:: Ce fichier CMD est destiné à tester les fonctions
:: de vérification de signature pour les fichiers CMD
:: Version 1.0
:: ---------------------------------------------

echo Test de vérification de signature CMD pour SignFile
echo.
echo Date d'exécution: %date% %time%
echo.

:: Vérifier les arguments
if "%1"=="" (
    set ACTION=Test
) else (
    set ACTION=%1
)

echo Action spécifiée: %ACTION%
echo.

:: Créer un fichier journal
set LOGFILE=%TEMP%\SignFileTestCMD.log
echo [%date% %time%] Début du script > %LOGFILE%

:: Exécution des tests
if "%ACTION%"=="Test" (
    echo Exécution du test simple...
    echo [%date% %time%] Test simple exécuté >> %LOGFILE%
    
    :: Afficher des informations système basiques
    echo Informations système:
    echo -----------------
    systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"System Manufacturer" /C:"System Model"
    echo -----------------
    
    echo [%date% %time%] Informations système affichées >> %LOGFILE%
) else if "%ACTION%"=="Info" (
    echo Récupération des informations système détaillées...
    echo [%date% %time%] Récupération des informations système >> %LOGFILE%
    
    :: Informations plus détaillées
    ver
    echo.
    echo Utilisateur: %USERNAME%
    echo Ordinateur: %COMPUTERNAME%
    echo Architecture: %PROCESSOR_ARCHITECTURE%
    echo.
    
    echo [%date% %time%] Informations détaillées affichées >> %LOGFILE%
) else (
    echo Action non reconnue: %ACTION%
    echo [%date% %time%] Action non reconnue: %ACTION% >> %LOGFILE%
)

echo.
echo Test de signature terminé.
echo [%date% %time%] Fin du script >> %LOGFILE%
echo Fichier journal créé: %LOGFILE%

:: SIG # Begin signature block
:: Ce bloc est normalement généré par l'outil de signature
:: et serait remplacé par une vraie signature
:: SIG # End signature block