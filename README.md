# SteamBOQ_AI

AI-Assisted Utility Piping Design & BOQ Generation Platform

---

## 1. Project Overview

## 2. Vision

## 3. Objectives

## 4. Current Features

## 5. Software Architecture

## 6. Project Structure

## 7. Engineering Modules

## 8. Calculation Methodology

## 9. Technologies Used

## 10. Development Roadmap

## 11. Current Version

## 12. Author

# SteamBOQ_AI

**AI-Assisted Utility Piping Design & BOQ Generation Platform**

SteamBOQ_AI is an engineering software platform being developed to automate the preliminary design, hydraulic analysis, and Bill of Quantities (BOQ) generation for industrial steam and hot oil utility piping systems.

The objective is to reduce engineering time, improve calculation consistency, and provide rapid design recommendations for utility piping networks used in chemical, pharmaceutical, food processing, dairy, textile, and other process industries.

The application combines classical mechanical engineering calculations with a modular software architecture, enabling engineers to perform equipment sizing, pipe sizing, hydraulic validation, and engineering estimation through a single integrated workflow.

Although the initial development focuses on saturated steam utility systems, the software architecture is designed to support multiple utility services in future releases, including condensate, hot oil, compressed air, chilled water, cooling water, and process fluids.

---

**Current Development Status**

Version **0.1** delivers the complete engineering calculation engine for steam and condensate pipe sizing, including hydraulic validation and engineering result reporting. Future versions will expand the software toward complete distribution network design, automatic component selection, BOQ generation, and project cost estimation.



## Vision

The vision of SteamBOQ_AI is to become an intelligent engineering platform that assists mechanical and process engineers in designing industrial utility piping systems with greater speed, consistency, and technical accuracy.

The platform aims to bridge the gap between conventional engineering practices and modern artificial intelligence by automating repetitive engineering calculations while preserving established engineering standards and design methodologies.

Rather than replacing engineering judgment, SteamBOQ_AI is designed to function as an engineering assistant that performs preliminary calculations, validates hydraulic parameters, recommends suitable piping components, and generates engineering documentation, allowing engineers to focus on design decisions and project execution.

The long-term objective is to develop a unified platform capable of supporting multiple industrial utility systems, including:

- Steam Systems
- Condensate Recovery Systems
- Hot Oil Systems
- Cooling Water Systems
- Chilled Water Systems
- Compressed Air Systems
- Process Fluid Distribution Networks

By combining engineering knowledge, structured databases, hydraulic calculations, and AI-assisted decision support, SteamBOQ_AI aims to become a comprehensive utility piping design and estimation solution for the process industry.



## Objectives

SteamBOQ_AI is being developed with the objective of simplifying and standardizing the preliminary engineering design of industrial utility piping systems. The platform focuses on reducing manual engineering effort while maintaining compliance with established engineering principles and industry practices.

### Engineering Objectives

- Automate steam demand estimation based on process heating requirements.
- Recommend suitable steam and condensate pipe sizes using hydraulic design criteria.
- Perform engineering calculations based on accepted mechanical engineering equations and standards.
- Evaluate hydraulic parameters such as velocity, Reynolds number, relative roughness, friction factor, equivalent length, and pressure drop.
- Validate piping designs against user-defined engineering criteria.
- Support preliminary design of steam distribution networks.
- Generate engineering reports suitable for design review and project estimation.
- Develop standardized engineering databases for pipes, fittings, valves, steam properties, and utility components.

### Software Objectives

- Provide a modular and scalable software architecture for future expansion.
- Minimize repetitive manual calculations performed during utility piping design.
- Improve engineering consistency across multiple projects.
- Enable rapid preliminary engineering during proposal and estimation stages.
- Generate structured engineering outputs that can be directly used for BOQ preparation.
- Maintain separation between engineering calculations, databases, user interface, and reporting modules.
- Build a platform capable of supporting multiple industrial utility services through a common engineering framework.

### Long-Term Objectives

Future releases of SteamBOQ_AI are planned to include:

- Steam Distribution Network Design
- Condensate Recovery Network Design
- Automatic Valve Selection
- Steam Trap Selection
- Pipe Support Recommendations
- Insulation Thickness Selection
- Expansion Loop and Expansion Joint Recommendations
- Equipment Utility Sizing
- Complete Bill of Quantities (BOQ) Generation
- Preliminary Cost Estimation
- AI-Assisted Engineering Recommendations
- Support for Hot Oil, Cooling Water, Chilled Water, Compressed Air, and other utility systems.



## Current Features

The current version of SteamBOQ_AI implements the core engineering calculation engine required for preliminary steam utility piping design.

### Process Engineering

- Product heating load calculation
- Heat load estimation
- Steam requirement calculation
- Steam property lookup based on operating pressure

### Steam Distribution Engineering

- Steam pipe sizing
- Steam velocity calculation
- Reynolds number calculation
- Relative roughness calculation
- Darcy friction factor calculation
- Equivalent pipe length calculation
- Pressure drop calculation
- Hydraulic design validation

### Condensate Engineering

- Condensate generation calculation
- Condensate property lookup
- Condensate pipe sizing
- Hydraulic validation for condensate piping

### Engineering Reporting

- Structured engineering result summaries
- Hydraulic validation report
- Pipe selection summary
- Distribution summary
- Equivalent length report
- Fitting summary

### Engineering Databases

The software currently maintains dedicated engineering databases for:

- Steam properties
- Carbon steel pipe dimensions
- Pipe roughness values
- Standard pipe schedules
- Standard pipe weights
- Equivalent length values for fittings

### Software Architecture

Current implementation follows a modular architecture consisting of:

- Calculation Engine
- Engineering Databases
- Reporting Layer
- Reusable Components
- Streamlit User Interface



## Software Architecture

SteamBOQ_AI follows a modular, layered architecture that separates engineering calculations, engineering data, business logic, user interface, and reporting into independent components.

This approach improves maintainability, scalability, and code reusability while allowing new utility systems to be integrated with minimal changes to the existing codebase.

The software architecture is organized into the following layers.

### User Interface Layer

Responsible for user interaction and data collection.

Components:

- Streamlit Pages
- Engineering Forms
- Navigation
- User Inputs
- Engineering Reports

Responsibilities:

- Accept engineering inputs
- Display engineering results
- Display validation reports
- Present engineering summaries

---

### Engineering Calculation Layer

Contains all engineering calculation modules.

Current modules include:

- Heat Load Calculation
- Steam Quantity Calculation
- Steam Property Lookup
- Steam Pipe Sizing
- Condensate Pipe Sizing
- Velocity Calculation
- Reynolds Number
- Relative Roughness
- Friction Factor
- Equivalent Length
- Pressure Drop
- Hydraulic Validation

Each calculation module performs a single engineering task and returns structured outputs without interacting directly with the user interface.

---

### Engineering Database Layer

Stores engineering reference data used throughout the application.

Current databases include:

- Steam Properties
- Pipe Dimensions
- Pipe Roughness
- Fittings Equivalent Length
- Engineering Constants

The database layer isolates engineering data from calculation logic, allowing updates without modifying calculation modules.

---

### Reporting Layer

Transforms calculation outputs into structured engineering reports.

Current reports include:

- Steam Summary
- Pipe Selection Summary
- Hydraulic Validation
- Distribution Summary
- Equivalent Length Summary
- Fitting Details

Future reports will include:

- Valve Schedule
- Steam Trap Schedule
- BOQ Summary
- Cost Estimation Report

---

### Shared Components Layer

Contains reusable UI components shared across multiple engineering modules.

Current components include:

- Engineering Tables
- Engineering Results
- Project Header

Future reusable components may include:

- Report Cards
- Charts
- Engineering Warnings
- Interactive Network Diagrams

---

### Session Management Layer

Maintains project data throughout the engineering workflow.

Responsibilities include:

- User inputs
- Intermediate calculation results
- Final engineering outputs
- Report generation data

This layer enables different engineering modules to communicate without unnecessary coupling.

---

### Design Philosophy

SteamBOQ_AI follows several software engineering principles:

- Modular Design
- Single Responsibility Principle
- Separation of Concerns
- Reusable Components
- Database-Driven Engineering
- Extensible Architecture

These principles allow additional utility systems and engineering modules to be integrated without restructuring the existing codebase.



## Project Structure

SteamBOQ_AI/
│
├── app/
│   ├── pages/
│   │   ├── 1_Project.py
│   │   ├── 2_Engineering.py
│   │   ├── 3_Distribution.py
│   │   ├── 4_BOQ.py
│   │   └── 5_Costing.py
│   │
│   ├── forms/
│   │   ├── steam_form.py
│   │   ├── condensate_form.py
│   │   └── ...
│   │
│   ├── components/
│   │   ├── engineering_table.py
│   │   ├── engineering_results.py
│   │   ├── project_header.py
│   │   └── ...
│   │
│   └── utils/
│       ├── session.py
│       └── ...
│
├── calculations/
│   ├── common/
│   ├── steam/
│   ├── condensate/
│   └── ...
│
├── databases/
│   ├── STEAM_DB.xlsx
│   ├── PIPE_DB.xlsx
│   ├── FITTINGS_DB.xlsx
│   └── ...
│
├── documentation/
│   ├── CHANGELOG.md
│   ├── README.md
│   └── ...
│
├── requirements.txt
└── app.py


## Development Roadmap

### Version 0.1 (Current)

✔ Heat Load Calculation

✔ Steam Quantity Calculation

✔ Steam Property Lookup

✔ Steam Pipe Sizing

✔ Condensate Pipe Sizing

✔ Hydraulic Validation

✔ Pressure Drop Calculation

✔ Equivalent Length Calculation

✔ Engineering Reports

---

### Version 0.2

- Distribution Network Design
- Header Pipe Sizing
- Branch Line Sizing
- Condensate Network
- Multiple Equipment Support

---

### Version 0.3

- Automatic BOQ Generation
- Valve Schedule
- Steam Trap Selection
- Pipe Schedule
- Insulation Calculation
- Material Summary

---

### Version 0.4

- Cost Estimation
- Rate Database
- Material Costing
- Labour Costing
- Project Cost Summary

---

### Future Vision

- Hot Oil Utility Module
- Chilled Water Module
- Cooling Water Module
- Compressed Air Module
- CIP Utility Module
- 3D Network Visualization
- PDF Report Generation
- AI Engineering Assistant