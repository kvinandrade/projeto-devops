-- Schema inicial Pedidos Veloz
CREATE TABLE IF NOT EXISTS pedidos (
    id UUID PRIMARY KEY,
    cliente_id VARCHAR(64) NOT NULL,
    itens JSONB NOT NULL,
    valor_total NUMERIC(12, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CRIADO',
    pagamento_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estoque (
    sku VARCHAR(64) PRIMARY KEY,
    nome VARCHAR(128) NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagamentos (
    id UUID PRIMARY KEY,
    pedido_id UUID NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    provedor VARCHAR(64) NOT NULL DEFAULT 'mock-acquirer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO estoque (sku, nome, quantidade) VALUES
    ('SKU-CAMISA-P', 'Camisa Básica P', 50),
    ('SKU-CAMISA-M', 'Camisa Básica M', 80),
    ('SKU-TENIS-42', 'Tênis Runner 42', 30),
    ('SKU-MOCHILA', 'Mochila Urban', 25)
ON CONFLICT (sku) DO NOTHING;
