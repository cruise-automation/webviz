use zaplib::*;

fn foo() {
    log!("The Answer to the Ultimate Question of Life, The Universe, and Everything is 42")
}

fn get_zaplib_version() -> String {
    "v0.0.3".to_string()
}

fn call_rust(name: String, _params: Vec<ZapParam>) -> Vec<ZapParam> {
    if name == "foo" {
        foo();
    } else if name == "get_zaplib_version" {
        let version = get_zaplib_version();
        let response = version.into_param();
        return vec![response];
    } else if name == "get_zaplib_test_string" {
        // Keep in sync with zaplib.test.js
        return vec!["dummy_string".to_string().into_param()];
    }
    vec![]
}

register_call_rust!(call_rust);

#[cfg(test)]
mod tests {

    #[test]
    fn dummy_test() {
        assert_eq!(true, true);
    }
}
