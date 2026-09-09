# Planejamento — temporadas da liga e edição de torneios

Status: implementado em 9 de setembro de 2026. Este documento permanece como referência funcional e roteiro de testes.

## 1. Zerar o ranking de uma liga

### Objetivo

Permitir que somente o proprietário ou administrador da liga encerre a pontuação atual e inicie uma nova etapa, mantendo a liga, seus administradores e sua lista de atletas.

### Local da função

- Tela da liga → aba **A Liga / Configurações**.
- Seção destacada como ação crítica: **Zerar ranking da liga**.
- Invisível para atletas sem permissão administrativa.

### Confirmação em duas etapas

1. Primeiro aviso:
   - Título: **Zerar ranking da liga?**
   - Texto: **Ao continuar, todos os pontos atuais da liga serão perdidos.**
   - Ações: **Cancelar** e **Continuar**.
2. Confirmação final:
   - Título: **Tem certeza?**
   - Texto: **Todos os pontos serão perdidos e a classificação da liga ficará zerada.**
   - Ações: **Voltar** e **Sim, zerar ranking**.

### Dados que serão zerados

- Pontos totais.
- Vitórias.
- Pneus.
- Participações.
- Histórico que compõe a classificação da etapa atual.

### Dados que serão preservados

- Nome, descrição, código, capa e endereço da liga.
- Proprietário e administradores.
- Lista de atletas oficiais.
- Torneios antigos e suas classificações finais.

### Recomendação

Em vez de apagar definitivamente a etapa anterior, criar um pequeno sistema de temporadas. Antes de zerar, o app salva um resumo em `rankings/{rankingId}/seasons/{seasonId}` e incrementa `currentSeason`. A tabela principal fica zerada, mas o administrador ainda pode consultar o histórico de temporadas no futuro. A interface pode continuar dizendo “Zerar ranking”; o arquivamento acontece silenciosamente por segurança.

Também registrar `lastRankingResetAt` e `lastRankingResetBy`. Esses novos campos exigirão atualização da lista de campos permitidos nas regras do Firestore.

### Operação técnica

- Revalidar a permissão administrativa imediatamente antes da execução.
- Fazer a limpeza dos documentos em `rankings/{rankingId}/players` em lotes atômicos.
- Não remover documentos de `leagueAthletes` nem `athleteIds`.
- Exibir confirmação de sucesso somente depois de todos os lotes terminarem.
- Bloquear cliques repetidos enquanto o processo estiver em andamento.

## 2. Editar um torneio já criado

### Local da função

- Botão compacto **Editar torneio**, ao lado de **Encerrar**, no cabeçalho/card do torneio.
- O botão continua visível quando a edição estiver bloqueada, para explicar ao usuário por que não pode editar.
- Apenas o criador do torneio ou um administrador da liga vinculada poderá editar.

### Regra de disponibilidade

A configuração poderá ser editada somente quando:

```ts
!tournament.isFinished && tournament.matches.every(match => !match.isCompleted)
```

Se existir qualquer partida com `isCompleted === true`, mostrar:

> Não é possível editar este torneio porque ele já possui resultados confirmados. Para liberar a edição, use “Editar resultado” nas partidas confirmadas.

Quando o usuário usar **Editar resultado** na tela normal do torneio, aquela partida deixa de estar confirmada. O botão de configuração volta a funcionar assim que não existir nenhuma outra partida confirmada.

A edição feita depois da classificação final não libera a configuração estrutural do torneio. Para garantir isso, manter um indicador persistente como `hasEverFinished` ou `setupLockedAt`; ele não deve ser removido pelo fluxo de correção histórica de resultados.

### Campos editáveis na primeira versão

1. Nomes ou ocupantes das vagas dos atletas.
2. Nomes ou ocupantes das vagas das duplas, preservando cada dupla e o chaveamento existente.
3. Formato do placar/quantidade de games (`matchFormat`).
4. Ordem dos critérios de desempate (`rankingCriteria`), desde que nenhum resultado esteja confirmado.

As quadras não fazem parte desta versão.

### Preservação das duplas e partidas

- Os IDs das vagas e das equipes devem permanecer estáveis.
- Alterar João/Cláudio para João/Marcelo mantém a mesma dupla e todas as partidas daquela vaga.
- Alterar os dois nomes mantém a equipe na mesma posição do chaveamento.
- Não gerar novamente sorteio, rodadas, grupos ou mata-mata apenas por uma troca de atleta.

### Diferença entre torneio comum e ranqueado

- **Torneio comum:** o nome da vaga pode ser alterado diretamente, mantendo seu ID interno.
- **Torneio ranqueado:** deve-se substituir o atleta por outro atleta oficial da liga, atualizando o `memberId` correspondente. Trocar só o texto exibido faria os pontos serem creditados ao atleta antigo.
- Caso seja permitido convidado/manual em torneio ranqueado, a tela deve avisar claramente que essa pessoa não pontuará.

### Mudança da quantidade de games

- Atualizar `matchFormat` no torneio.
- Como não haverá resultados confirmados, zerar placares provisórios (`currentSet`) e remover `sets`/`winnerId` residuais para evitar um placar digitado sob uma regra antiga.
- Manter confrontos, rodadas, quadras e duplas intactos.

### Mudança dos critérios de desempate

- Permitir reordenar os mesmos critérios disponíveis na criação.
- Atualizar `rankingCriteria` sem alterar os confrontos.
- Recalcular toda classificação derivada imediatamente na tela.
- Se no futuro houver uma fase eliminatória já gerada, bloquear a alteração ou invalidar e gerar novamente essa fase; nunca manter classificados gerados pelos critérios anteriores.

### Segurança contra alterações simultâneas

Ao salvar, usar transação ou nova leitura do documento. Se outro aparelho tiver confirmado um resultado enquanto a tela de edição estava aberta, cancelar o salvamento e informar que o torneio mudou e precisa ser recarregado.

## 3. Ajustes técnicos previstos

- Adicionar um estado/modal próprio para edição de configuração do torneio.
- Criar funções puras para substituir atleta mantendo a vaga e para limpar placares provisórios.
- Diferenciar edição normal de partida e correção após o torneio finalizado.
- Atualizar os campos do documento `tournaments` sem recriar o torneio.
- Atualizar `matches_group_stage` e `matches_knockout_stage` quando existirem, mantendo-os sincronizados com `matches`.
- Atualizar regras do Firestore para campos de temporada/auditoria da liga.

## 4. Testes obrigatórios antes da publicação

- Liga: somente administrador visualiza e consegue zerar.
- Liga: cancelar em qualquer uma das duas confirmações não altera dados.
- Liga: atletas permanecem cadastrados após zerar.
- Liga: classificação fica integralmente zerada e torneios antigos permanecem acessíveis.
- Torneio: edição funciona quando nenhuma partida está confirmada.
- Torneio: uma única partida confirmada bloqueia a edição.
- Torneio: desfazer a confirmação da única partida libera a edição normal.
- Torneio: correção feita após a classificação final não libera configuração estrutural.
- Duplas: trocar um ou os dois atletas não altera confrontos nem posição da dupla.
- Ranqueado: pontos futuros são creditados ao novo atleta, nunca ao substituído.
- Formato: mudar games limpa placares provisórios e mantém as rodadas.
- Critérios: mudar a ordem atualiza a classificação corretamente.
- Concorrência: resultado confirmado em outro aparelho impede um salvamento estrutural atrasado.

## 5. Ordem sugerida de implementação

1. Trava confiável de edição e distinção entre edição normal e correção histórica.
2. Edição de atletas/duplas preservando IDs e vínculos da liga.
3. Edição do formato de games e limpeza de placares provisórios.
4. Edição da ordem dos critérios de desempate.
5. Reset do ranking com arquivamento opcional por temporada.
6. Regras do Firestore, testes integrados e validação em dois aparelhos.
