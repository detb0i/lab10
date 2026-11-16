import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Замініть на значення свого проєкту (Project URL і Publishable key)
const supabaseUrl = 'https://faxmfcnjwpdpkuuywtjo.supabase.co';
const supabaseKey = 'sb_publishable_Wj8Qy__MAJjBl_ZdrLilTA_r0zfMgnJ';
const db = createClient(supabaseUrl, supabaseKey);

const TYPES = ['Маршрутизатор', 'Комутатор', 'Файрвол', 'Сервер', 'Точка доступу', 'Принтер', 'Інше'];
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

const status = document.querySelector('#status');
const list = document.querySelector('#devices-list');
const searchInput = document.querySelector('#search');
const typeFilter = document.querySelector('#type-filter');
const sortSelect = document.querySelector('#sort');

const form = document.querySelector('#device-form');
const nameInput = document.querySelector('#name');
const typeSelect = document.querySelector('#device_type');
const departmentInput = document.querySelector('#department');
const ipInput = document.querySelector('#ip_address');

for (const t of TYPES) {
  typeFilter.append(new Option(t, t));
  typeSelect.append(new Option(t, t));
}

// Екранування спецсимволів шаблону LIKE (% _ \)
function escapeLike(text) {
  return text.replace(/[\\%_]/g, (ch) => '\\' + ch);
}

function validIp(ip) {
  return IP_RE.test(ip) && ip.split('.').every((n) => Number(n) <= 255);
}

async function loadDevices() {
  status.textContent = 'Завантаження...';
  list.replaceChildren();

  const [field, dir] = sortSelect.value.split(':');
  const search = searchInput.value.trim();
  const type = typeFilter.value;

  try {
    let query = db.from('network_devices').select('id, name, device_type, department, ip_address');
    if (search) query = query.ilike('name', `%${escapeLike(search)}%`);
    if (type) query = query.eq('device_type', type);
    query = query.order(field, { ascending: dir === 'asc' });

    const { data, error } = await query;

    if (error) {
      console.error('Помилка завантаження:', error);
      status.textContent = 'Не вдалося завантажити дані. Перевірте консоль браузера.';
      return;
    }

    if (data.length === 0) {
      const item = document.createElement('li');
      item.className = 'empty';
      item.textContent = (search || type)
        ? 'За вашим запитом нічого не знайдено.'
        : 'У таблиці поки немає записів.';
      list.append(item);
      status.textContent = 'Знайдено пристроїв: 0';
      return;
    }

    for (const d of data) {
      const item = document.createElement('li');
      item.textContent = `${d.name} – ${d.device_type}, ${d.department}, ${d.ip_address}`;
      list.append(item);
    }
    status.textContent = `Знайдено пристроїв: ${data.length}`;
  } catch (err) {
    console.error('Помилка запиту:', err);
    status.textContent = 'Не вдалося виконати запит. Перевірте інтернет-з\'єднання.';
  }
}

let timer;
searchInput.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(loadDevices, 300);
});
typeFilter.addEventListener('change', loadDevices);
sortSelect.addEventListener('change', loadDevices);

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const device_type = typeSelect.value;
  const department = departmentInput.value.trim();
  const ip_address = ipInput.value.trim();

  if (!name || name.length > 100 || !department || department.length > 100 || !TYPES.includes(device_type)) {
    status.textContent = 'Перевірте назву, тип і підрозділ.';
    return;
  }
  if (!validIp(ip_address)) {
    status.textContent = 'Некоректна IP-адреса (приклад: 10.0.0.10).';
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  status.textContent = 'Додавання пристрою...';

  try {
    const { error } = await db
      .from('network_devices')
      .insert({ name, device_type, department, ip_address });

    if (error) {
      console.error('Помилка додавання:', error);
      status.textContent = 'Не вдалося додати пристрій.';
      return;
    }

    form.reset();
    await loadDevices();
    status.textContent = `Пристрій «${name}» додано. ${status.textContent}`;
  } catch (err) {
    console.error('Помилка запиту:', err);
    status.textContent = 'Не вдалося виконати запит.';
  } finally {
    submitButton.disabled = false;
  }
});

loadDevices();
