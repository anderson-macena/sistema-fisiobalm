# Fisiobalm — Sistema de Gestão de Studio de Pilates

Aplicação React para gerenciamento de agendamentos, alunos, prontuários e métricas de um studio de fisioterapia/pilates, com backend Firebase.

## Funcionalidades

- Agenda diária e semanal com turnos (manhã/tarde)
- Cadastro e gestão de alunos com validação de CPF
- Prontuário clínico por aluno
- Anexos de documentos e exames
- Dashboard com métricas por fisioterapeuta
- Controle de créditos e reposições
- Alertas de plano próximo ao vencimento
- Renovação automática da agenda semanal
- Bloqueio de vagas individuais
- Log de auditoria completo

## Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/fisiobalm.git
cd fisiobalm
npm install
```

### 2. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com seus dados:

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais Firebase e dados de configuração.

### 3. Configure o Firebase

No [Firebase Console](https://console.firebase.google.com):

1. Crie um projeto
2. Ative **Authentication → Anonymous**
3. Ative **Firestore Database** e configure as regras abaixo

#### Regras do Firestore recomendadas

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fisiobalm/{appId}/{document=**} {
      // Permite leitura/escrita apenas para usuários autenticados
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Inicie o projeto

```bash
npm run dev
```

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_FIREBASE_API_KEY` | API Key do Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain do Firebase |
| `VITE_FIREBASE_PROJECT_ID` | ID do projeto Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID do Firebase |
| `VITE_APP_ID` | ID do espaço de dados no Firestore |
| `VITE_ADMINS` | JSON com lista de administradores |
| `VITE_PROF_MANHA` | Nome da fisioterapeuta do turno manhã |
| `VITE_PROF_TARDE` | Nome da fisioterapeuta do turno tarde |

### Formato de VITE_ADMINS

```json
[
  {"cpf":"00000000000","name":"Nome Completo","role":"admin"}
]
```

## Segurança

- Nenhuma credencial está hardcoded no código
- CPFs de administradores são lidos exclusivamente de variáveis de ambiente
- O arquivo `.env` está no `.gitignore` e nunca deve ser commitado
- A autenticação Firebase Anonymous protege o acesso ao Firestore

## Stack

- React 18 + Vite
- Firebase (Auth + Firestore)
- Tailwind CSS
- Lucide React (ícones)