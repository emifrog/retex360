import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUpload } from '@/components/rex/image-upload';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// `next/image` exige une configuration de domaines que ce test n'a pas à porter.
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

type Uploaded = Parameters<Parameters<typeof ImageUpload>[0]['onFilesChange']>[0];

/** Le formulaire, réduit à ce qu'il fait des pièces jointes : garder la liste. */
function Harness({ maxFiles = 10 }: { maxFiles?: number }) {
  const [files, setFiles] = useState<Uploaded>([]);
  return <ImageUpload files={files} onFilesChange={setFiles} maxFiles={maxFiles} maxSizeMB={5} />;
}

const photo = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

/** Le compteur « n / max fichiers », rendu par React en plusieurs nœuds de texte. */
const counterText = () =>
  [...document.querySelectorAll('p')]
    .map((p) => p.textContent)
    .find((t) => t?.endsWith('fichiers'));

describe('Pièces jointes — envoi de plusieurs fichiers', () => {
  let counter = 0;

  beforeEach(() => {
    counter = 0;
    global.fetch = jest.fn(async (_url: unknown, init?: { body?: FormData }) => {
      const file = init?.body?.get('file') as File;
      counter += 1;
      return {
        ok: true,
        json: async () => ({
          id: `att-${counter}`,
          file_name: file.name,
          file_type: 'application/pdf', // évite le rendu d'une vignette
          file_size: 1,
          storage_path: `rex-attachments/u/${file.name}`,
          url: `https://stockage.test/${file.name}`,
        }),
      };
    }) as unknown as typeof fetch;
  });

  it('rattache les trois fichiers sélectionnés ensemble', async () => {
    // Chaque envoi réussi appelait `onFilesChange([...files, nouveau])` avec la
    // liste d'AVANT la sélection : le troisième écrasait les deux premiers.
    // Trois messages de succès, une seule pièce jointe, deux fichiers orphelins.
    render(<Harness />);
    const input = document.getElementById('file-upload') as HTMLInputElement;

    await userEvent.upload(input, [photo('facade.jpg'), photo('sitac.jpg'), photo('cage.jpg')]);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(counterText()).toBe('3 / 10 fichiers'));
    expect(screen.getAllByText('facade.jpg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('sitac.jpg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('cage.jpg').length).toBeGreaterThan(0);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("garde les fichiers réussis quand l'un des envois échoue", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
      ok: false,
      json: async () => ({ error: 'Fichier refusé' }),
    }));
    render(<Harness />);
    const input = document.getElementById('file-upload') as HTMLInputElement;

    await userEvent.upload(input, [
      photo('refusee.jpg'),
      photo('bonne-1.jpg'),
      photo('bonne-2.jpg'),
    ]);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(counterText()).toBe('2 / 10 fichiers'));
  });

  it("n'envoie pas plus de fichiers qu'il ne reste de places", async () => {
    render(<Harness maxFiles={2} />);
    const input = document.getElementById('file-upload') as HTMLInputElement;

    await userEvent.upload(input, [photo('a.jpg'), photo('b.jpg'), photo('c.jpg')]);

    await waitFor(() => expect(counterText()).toBe('2 / 2 fichiers'));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
