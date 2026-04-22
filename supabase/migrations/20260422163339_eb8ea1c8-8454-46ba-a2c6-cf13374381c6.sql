
-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'usuario');
CREATE TYPE public.demanda_status AS ENUM ('aberto', 'em_execucao', 'impedido', 'cancelado', 'concluido');
CREATE TYPE public.demanda_urgencia AS ENUM ('baixa', 'media', 'alta', 'critica');

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER ROLES
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================
-- CATEGORIAS / SUBCATEGORIAS
-- ============================================
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subcategorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (categoria_id, nome)
);
ALTER TABLE public.subcategorias ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DEMANDAS
-- ============================================
CREATE TABLE public.demandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  subcategoria_id UUID REFERENCES public.subcategorias(id) ON DELETE SET NULL,
  urgencia public.demanda_urgencia NOT NULL DEFAULT 'media',
  prazo_desejado DATE,
  status public.demanda_status NOT NULL DEFAULT 'aberto',
  resposta_admin TEXT,
  solicitante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_demandas_solicitante ON public.demandas(solicitante_id);
CREATE INDEX idx_demandas_responsavel ON public.demandas(responsavel_id);
CREATE INDEX idx_demandas_status ON public.demandas(status);

-- ============================================
-- ANEXOS
-- ============================================
CREATE TABLE public.demanda_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id UUID NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tamanho_bytes BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.demanda_anexos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HISTÓRICO
-- ============================================
CREATE TABLE public.demanda_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id UUID NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  status_anterior public.demanda_status,
  status_novo public.demanda_status,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.demanda_historico ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  -- Default role: usuario comum
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'usuario');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER demandas_updated_at BEFORE UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- categorias
CREATE POLICY "Anyone authenticated can view active categorias" ON public.categorias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage categorias" ON public.categorias
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- subcategorias
CREATE POLICY "Anyone authenticated can view subcategorias" ON public.subcategorias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage subcategorias" ON public.subcategorias
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- demandas
CREATE POLICY "Users view own demandas" ON public.demandas
  FOR SELECT USING (auth.uid() = solicitante_id);
CREATE POLICY "Admins view all demandas" ON public.demandas
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Responsaveis view assigned demandas" ON public.demandas
  FOR SELECT USING (auth.uid() = responsavel_id);
CREATE POLICY "Users create own demandas" ON public.demandas
  FOR INSERT WITH CHECK (auth.uid() = solicitante_id);
CREATE POLICY "Admins update demandas" ON public.demandas
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete demandas" ON public.demandas
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- demanda_anexos
CREATE POLICY "Users view anexos of own demandas" ON public.demanda_anexos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.demandas d WHERE d.id = demanda_id AND d.solicitante_id = auth.uid())
  );
CREATE POLICY "Admins view all anexos" ON public.demanda_anexos
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert anexos in own demandas" ON public.demanda_anexos
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (SELECT 1 FROM public.demandas d WHERE d.id = demanda_id AND d.solicitante_id = auth.uid())
  );
CREATE POLICY "Admins insert anexos" ON public.demanda_anexos
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = uploaded_by);
CREATE POLICY "Admins delete anexos" ON public.demanda_anexos
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- demanda_historico
CREATE POLICY "Users view historico of own demandas" ON public.demanda_historico
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.demandas d WHERE d.id = demanda_id AND d.solicitante_id = auth.uid())
  );
CREATE POLICY "Admins view all historico" ON public.demanda_historico
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert historico" ON public.demanda_historico
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('demanda-anexos', 'demanda-anexos', false);

CREATE POLICY "Users upload to own demanda folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'demanda-anexos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users view own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'demanda-anexos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins view all anexo files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'demanda-anexos' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete anexo files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'demanda-anexos' AND
    public.has_role(auth.uid(), 'admin')
  );

-- ============================================
-- SEED: categorias iniciais
-- ============================================
INSERT INTO public.categorias (nome) VALUES
  ('TI'), ('RH'), ('Financeiro'), ('Operacional'), ('Outros');
