CUSTOM TEAM CRESTS
==================

Want to show team badges instead of the country flag? Drop image files in
THIS folder, named by the team's ID + .png (square images work best, e.g.
256x256). Then open  src/lib/data/teams.ts  and add the matching ID(s) to the
CUSTOM_CRESTS set near the bottom. That's it — the app shows your image and
falls back to the flag for anything you haven't added (or if an image fails
to load). To use .svg or .webp instead of .png, change CREST_EXT in that file.

Example:  put  BRA.png  here, then set  CUSTOM_CRESTS = new Set(["BRA"])

NOTE: You supply the artwork. No crest images ship with this project. You're
responsible for the rights to whatever images you add — fine for a private,
internal pool; just don't redistribute them publicly.

TEAM IDs (filename = ID + .png)
-------------------------------
MEX  Mexico            RSA  South Africa      KOR  South Korea      CZE  Czech Republic
CAN  Canada            BIH  Bosnia & Herz.    QAT  Qatar            SUI  Switzerland
BRA  Brazil            MAR  Morocco           HAI  Haiti            SCO  Scotland
USA  United States     PAR  Paraguay          AUS  Australia        TUR  Turkey
GER  Germany           CUW  Curacao           CIV  Ivory Coast      ECU  Ecuador
NED  Netherlands       JPN  Japan             SWE  Sweden           TUN  Tunisia
BEL  Belgium           EGY  Egypt             IRN  Iran             NZL  New Zealand
ESP  Spain             CPV  Cape Verde        KSA  Saudi Arabia     URU  Uruguay
FRA  France            SEN  Senegal           IRQ  Iraq             NOR  Norway
ARG  Argentina         ALG  Algeria           AUT  Austria          JOR  Jordan
POR  Portugal          COD  DR Congo          UZB  Uzbekistan       COL  Colombia
ENG  England           CRO  Croatia           GHA  Ghana            PAN  Panama
